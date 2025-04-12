import { Injectable } from '@nestjs/common';
import { CreateBotDto } from './dto/create-bot.dto';
import { UpdateBotDto } from './dto/update-bot.dto';
import { Context, Markup, Telegraf } from 'telegraf';
import { InjectModel } from '@nestjs/sequelize';
import { Bot } from './models/bot.model';
import { Message } from 'telegraf/typings/core/types/typegram';
import * as cron from 'node-cron';

import {
  ALREADY_REGISTRATED,
  BOT_STOPPED,
  INVALID_ID,
  LANGUAGE_UPDATED,
  MAIN_MENU_BUTTONS,
  REGISTRATED,
  SEND_ID,
  SEND_NAME,
  SEND_PHONE,
  SEND_PHONE_BUTTON,
  SEND_PHONE_ERROR,
} from 'src/language_data';
import { chunkArray } from 'src/app.constants';
import { Customers } from 'src/admin/models/customer.model';

@Injectable()
export class BotService {
  private readonly bot: Telegraf;

  constructor(
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectModel(Customers) private readonly customersModel: typeof Customers,
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN);

    this.startCronJob(); // ✅ To‘g‘ri joyga qo‘yildi
  }

  async onStop(ctx: Context) {
    try {
      const user = await this.botModel.findByPk(ctx.from.id);
      if (user) {
        const lang = user.language;
        await user.destroy();
        await ctx.reply(BOT_STOPPED[lang], {
          reply_markup: { remove_keyboard: true },
        });
      }
    } catch (error) {
      console.log('onStop: ', error);
    }
  }

  async onStart(ctx: Context) {
    if (ctx.chat.id < 0) return;

    const userId = ctx.from.id;
    const user = await this.botModel.findOne({
      where: { user_id: userId },
    });

    if (
      (user && ['lang', 'phone', 'name', 'id'].includes(user.last_step)) ||
      !user
    ) {
      if (user) {
        this.botModel.destroy({ where: { user_id: userId } });
      }

      await this.botModel.create({
        user_id: userId,
        last_step: 'lang',
      });

      await ctx.reply(
        `Assalomu alaykum! Botga xush kelibsiz.\n\nПривет! Добро пожаловать в бот.`,
        {
          parse_mode: 'HTML',
          ...Markup.keyboard([["🇺🇿O'zbekcha", '🇷🇺Русский']]).resize(),
        },
      );
    } else {
      if (user.last_step !== 'finish') {
        user.update({ last_step: 'finish' });
      }
      await ctx.reply(ALREADY_REGISTRATED[user.language], {
        parse_mode: 'HTML',
        ...Markup.keyboard(
          chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
        ).resize(),
      });
    }
  }

  async onLanguage(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);

      if (!user) {
        this.onStart(ctx);
        return;
      }
      if (user && user.last_step == 'lang') {
        const message = ctx.message as Message.TextMessage; // Explicit cast
        const language = message.text; // Foydalanuvchi yuborgan matn

        if (language === "🇺🇿O'zbekcha") user.language = 'uz';
        else if (language === '🇷🇺Русский') user.language = 'ru';

        user.last_step = 'phone';
        await user.save();

        await ctx.reply(SEND_PHONE[user.language], {
          parse_mode: 'HTML',
          ...Markup.keyboard([
            [Markup.button.contactRequest(SEND_PHONE_BUTTON[user.language])],
          ]).resize(),
        });
      } else if (user && user.last_step === 'finish') {
        const message = ctx.message as Message.TextMessage; // Explicit cast
        const language = message.text; // Foydalanuvchi yuborgan matn

        if (language === "🇺🇿O'zbekcha") user.language = 'uz';
        else if (language === '🇷🇺Русский') user.language = 'ru';

        await user.save();

        await ctx.reply(LANGUAGE_UPDATED[user.language], {
          parse_mode: 'HTML',
          ...Markup.keyboard(
            chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
          ).resize(),
        });
      }
    } catch (error) {
      console.log('onLanguage: ', error);
    }
  }

  async onContact(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('contact' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (!user) {
          this.onStart(ctx);
          return;
        }

        if (user && user.last_step === 'phone') {
          await user.update({
            last_step: 'name',
            phone: ctx.message.contact.phone_number,
          });

          await ctx.reply(SEND_NAME[user.language], {
            reply_markup: { remove_keyboard: true },
          });
        }
      }
    } catch (error) {
      console.log('onContact: ', error);
    }
  }

  async onAddPhoneNumber(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('text' in ctx.message) {
        const user = await this.botModel.findByPk(ctx.from.id);
        if (!user) {
          this.onStart(ctx);
          return;
        }
        if (user && user.last_step === 'phone') {
          const text = ctx.message.text.trim();

          // 🔧 Belgilardan tozalash (faqat raqamlar qoldiriladi)
          const cleanText = text.replace(/\D/g, ''); // +, -, bo‘sh joy — hammasini olib tashlaydi

          // 🔄 998 bilan boshlanmasa — boshiga 998 qo‘shamiz
          const normalized = cleanText.startsWith('998')
            ? cleanText
            : '998' + cleanText;

          // ✅ Raqam formati tekshiruvi (998 + 9 ta raqam bo‘lishi kerak)
          const phoneRegex = /^998\d{9}$/;

          if (phoneRegex.test(normalized)) {
            await user.update({
              last_step: 'name',
              phone: normalized,
            });

            await ctx.reply(SEND_NAME[user.language], {
              reply_markup: { remove_keyboard: true },
            });
          } else {
            await ctx.reply(SEND_PHONE_ERROR[user.language]);
          }
        }
      }
    } catch (error) {
      console.log('onAddPhoneNumber: ', error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      );
    }
  }

  async onText(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('text' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (!user) {
          this.onStart(ctx);
          return;
        }

        if (user && user.last_step === 'name') {
          await user.update({ name: ctx.message.text, last_step: 'id' });
          await ctx.reply(SEND_ID[user.language]);
        } else if (user && user.last_step === 'id') {
          if (!isNaN(+ctx.message.text)) {
            const customer = await this.customersModel.findOne({
              where: { customer_id: ctx.message.text },
            });
            if (customer) {
              await user.update({
                last_step: 'finish',
                sap_id: customer.customer_id,
                company_name: customer.customer_name,
              });
              await ctx.reply(REGISTRATED[user.language], {
                parse_mode: 'HTML',
                ...Markup.keyboard(
                  chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
                ).resize(),
              });
            } else {
              await ctx.reply(INVALID_ID[user.language]);
            }
          } else {
            await ctx.reply(INVALID_ID[user.language]);
          }
        }
      }
    } catch (error) {
      console.log('onText: ', error);
    }
  }

  async weekly_reminder() {
    const groups = await this.customersModel.findAll({
      attributes: ['customer_group_id'],
      raw: true,
    });

    // const
    const message =
      'Assalomu alaykum, hurmatli mijoz!\n\n' +
      'ALTITUDE jamoasi bilan hamkorlik qilayotganingiz uchun Sizga samimiy minnatdorchilik bildiramiz.\n\n' +
      'Kompaniyamizdagi texnik qo‘llab-quvvatlash guruhi SAP Business One tizimi bo‘yicha yuzaga kelishi mumkin bo‘lgan muammo yoki savollaringizni samarali hal etishga doimo tayyor.\n\n' +
      'Qo‘shimcha ma’lumot yoki yordam kerak bo‘lsa, quyidagi raqam orqali biz bilan bog‘laning:\n\n' +
      '📞 Telefon: 78 122 00 25\n\n' +
      '[Telegram](https://t.me/altitude_one) | [Instagram](https://www.instagram.com/altitude.uz/) | [LinkedIn](https://www.linkedin.com/company/altitude-uz/posts/?feedView=all)';

    const photoUrl =
      'AgACAgIAAxkBAAIOamf3rinfKb7uFhLIYOcfL3-pBvXYAAKT_DEbKlDBS7KkDQU6JlNiAQADAgADeAADNgQ';

    for (const group of groups) {
      try {
        if (group.customer_group_id) {
          await this.bot.telegram.sendPhoto(group.customer_group_id, photoUrl, {
            caption: message,
            parse_mode: 'Markdown',
          });
        }
      } catch (error) {
        console.error(`Xabar jo'natishda xatolik: `, error);
      }
    }
  }

  // ✅ Cron jobni ishga tushirish
  startCronJob() {
    cron.schedule(
      '41 17 * * 4',
      () => {
        this.weekly_reminder(); // Haftalik xabarni jo‘natish
      },
      {
        timezone: 'Asia/Tashkent',
      },
    );
  }
}
