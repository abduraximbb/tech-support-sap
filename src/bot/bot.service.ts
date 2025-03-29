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
  INVALID_ID,
  LANGUAGE_UPDATED,
  MAIN_MENU_BUTTONS,
  REGISTRATED,
  SEND_ID,
  SEND_NAME,
  SEND_PHONE,
  SEND_PHONE_BUTTON,
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

        if (user && user.last_step == 'phone') {
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
      'Ассалому алайкум, ҳурматли мижоз! \n\n' +
      'ABC жамоаси сиз билан ҳамкорликда ишлашдан мамнун. ' +
      'ABC компаниясидаги қўллаб-қувватлаш жамоаси сизда учрайдиган муаммоларни ҳал қилишга тайёр. ' +
      'Агар SAP Business One дастурида қандайдир муаммолар туғилса, қуйидаги рақамга боғланинг: \n\n' +
      '📞 Tel: 78 122 00 25';

    const gifUrl =
      'CgACAgIAAxkBAAIJOGfihy1t7n9r3zGd0WAUAAFvVVgmHAAChFUAAvNjQEgqDwQe4Nw-7zYE';

    for (const group of groups) {
      try {
        if (group.customer_group_id) {
          await this.bot.telegram.sendDocument(
            group.customer_group_id,
            gifUrl,
            {
              caption: message,
              parse_mode: 'HTML',
            },
          );
        }
      } catch (error) {
        console.error(`Xabar jo'natishda xatolik: `, error);
      }
    }
  }

  // ✅ Cron jobni ishga tushirish
  startCronJob() {
    cron.schedule(
      '16 14 * * 4', // Har dushanba 14:40
      () => {
        this.weekly_reminder(); // Haftalik xabarni jo‘natish
      },
      {
        timezone: 'Asia/Tashkent',
      },
    );

    console.log('✅ Har dushanba 14:40 da avtomatik xabar yuboriladi.');
  }
}
