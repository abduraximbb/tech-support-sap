import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Appeals, ImportanceLevel, Status } from './models/appeal.model';
import { Context, Markup } from 'telegraf';
import { Bot } from 'src/bot/models/bot.model';
import { Telegraf } from 'telegraf';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

import {
  ANSWERED,
  ANSWERED_TIME,
  APPEAL_DETAILS,
  APPEAL_EDITED,
  APPEAL_ID,
  APPEAL_NOT_FOUND,
  APPEAL_TEXT,
  APPEALS,
  BACK_BUTTON,
  BACT_TO_MENU,
  CALL_DETAILS,
  CHOOSE_APPPEAL,
  CHOOSE_IMPOERTANCE,
  DATE_APPEAL,
  EDIT_APPEAL,
  EMPLOYEE_NAME,
  IMPORTANCE_LEVEL,
  MAIN_MENU,
  MAIN_MENU_BUTTONS,
  NEW_OR_UPDATED_APPEAL,
  NO_ANSWERED,
  NO_APPEALS,
  SEND_BUTTON,
  SEND_MEDIA,
  STATUS_APPEAL,
  SUCCESS_APPEALED,
  SUCCESSED_CALL_APPEAL,
  WE_ARE_CALLING,
  WRITE_TEXT,
} from 'src/language_data';
import { GROUP_ID, chunkArray } from 'src/app.constants';
import { Calls } from './models/calls.model';
import { keyboard } from 'telegraf/typings/markup';
import { Customers } from 'src/admin/models/customer.model';
import { TemporaryDate } from './models/temporary-date.model';

@Injectable()
export class AppealsService {
  private readonly bot: Telegraf;
  constructor(
    @InjectModel(Appeals) private readonly appealsModel: typeof Appeals,
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectModel(Calls) private readonly callsModel: typeof Calls,
    @InjectModel(Customers) private readonly customersModel: typeof Customers,
    @InjectModel(TemporaryDate)
    private readonly temporaryDateModel: typeof TemporaryDate,
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
  }

  async onAppeal(ctx: Context) {
    if (ctx.chat.id < 0) return;

    try {
      const user = await this.botModel.findByPk(ctx.from.id);
      if (user && user.last_step === 'finish') {
        await user.update({ last_step: 'appeal_appeal' });

        await ctx.reply(WRITE_TEXT[user.language], {
          parse_mode: 'HTML',
          ...Markup.keyboard([[BACT_TO_MENU[user.language]]]).resize(),
        });
      }
    } catch (error) {
      console.log('onAppeal', error);
    }
  }

  async onAppealText(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('text' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);
        if (user && user.last_step === 'appeal_appeal') {
          await user.update({ last_step: 'media_appeal' });

          const generateId = (): number => {
            const timestamp = Number(Date.now().toString().slice(-5)); // Oxirgi 5 ta raqamni number qilish
            const randomPart = Math.floor(100 + Math.random() * 900); // 3 xonali tasodifiy son
            return timestamp * 1000 + randomPart; // Natijani raqamga aylantirish
          };

          await this.appealsModel.create({
            id: generateId(),
            user_id: userId,
            sap_id: user.sap_id,
            text: ctx.message.text,
            name: user.name,
            company_name: user.company_name,
          });
          await ctx.reply(SEND_MEDIA[user.language], {
            parse_mode: 'HTML',
            ...Markup.keyboard([[SEND_BUTTON[user.language]]])
              .resize()
              .oneTime(),
          });
        }
      }
    } catch (error) {
      console.log('onAppealText', error);
    }
  }

  async onAppealFile(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('document' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (user && user.last_step === 'media_appeal') {
          const appeal = await this.appealsModel.findOne({
            where: { user_id: userId },
            order: [['updatedAt', 'DESC']], // ID bo‘yicha kamayish tartibida saralash
          });

          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'file',
                file_name: ctx.message.document.file_id,
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('onAppealFile', error);
    }
  }

  async onAppealPhoto(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('photo' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (user && user.last_step === 'media_appeal') {
          const appeal = await this.appealsModel.findOne({
            where: { user_id: userId },
            order: [['updatedAt', 'DESC']], // ID bo‘yicha kamayish tartibida saralash
          });

          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'photo',
                file_name: ctx.message.photo[3].file_id,
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('onAppealFile', error);
    }
  }

  async onAppealVoice(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('voice' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (user && user.last_step === 'media_appeal') {
          const appeal = await this.appealsModel.findOne({
            where: { user_id: userId },
            order: [['updatedAt', 'DESC']], // ID bo‘yicha kamayish tartibida saralash
          });

          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'voice',
                file_name: ctx.message.voice.file_id,
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('onAppealFile', error);
    }
  }

  async onAppealVideo(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      if ('video' in ctx.message) {
        const userId = ctx.from.id;
        const user = await this.botModel.findByPk(userId);

        if (user && user.last_step === 'media_appeal') {
          const appeal = await this.appealsModel.findOne({
            where: { user_id: userId },
            order: [['updatedAt', 'DESC']], // ID bo‘yicha kamayish tartibida saralash
          });

          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'video',
                file_name: ctx.message.video.file_id,
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('onAppealFile', error);
    }
  }

  async onAppealImportance(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);

      const appeal = await this.appealsModel.findOne({
        where: { user_id: userId },
        order: [['updatedAt', 'DESC']], // ID bo‘yicha kamayish tartibida saralash
      });

      if (user && user.last_step === 'importance_appeal') {
        await user.update({ last_step: 'finish' });
        await appeal.update({
          importance_level:
            ImportanceLevel[ctx.callbackQuery['data'].split('_')[1]],
          updatedAt: new Date(),
          status: Status.WAITING,
        });
      }

      await ctx.deleteMessage(ctx?.message?.message_id);

      await ctx.reply(
        `${SUCCESS_APPEALED[user.language][0]}\n${SUCCESS_APPEALED[user.language][1]} - ${appeal.id}\n${SUCCESS_APPEALED[user.language][2]}`,
        {
          parse_mode: 'HTML',
          ...Markup.keyboard(
            chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
          ).resize(),
        },
      );

      const formatDateTime = (date: Date): string => {
        return new Intl.DateTimeFormat('uz-UZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false, // 24 soatlik format
        })
          .format(date)
          .replace(/\//g, '.')
          .replace(',', '');
      };

      // let messageText = `Yangi murojaat\nMurojaat ID: ${appeal.id}\nUser ID: ${userId}\nSAP ID: ${appeal.sap_id}\nCompany name: ${user.company_name}\nUser name: ${user.name}\nMurojaat matni: ${appeal.text}\nMuhimlilik: ${appeal.importance_level}\nMurojaat vaqti: ${formatDateTime(new Date(appeal.updatedAt))}`;

      let messageText = `<b>${NEW_OR_UPDATED_APPEAL[user.language][0]}</b>\n
<b>${APPEAL_DETAILS[user.language][0]}</b> ${appeal.id}\n
<b>${APPEAL_DETAILS[user.language][1]}</b> ${userId}\n
<b>${APPEAL_DETAILS[user.language][2]}</b> ${appeal.sap_id}\n
<b>${APPEAL_DETAILS[user.language][3]}</b> ${user.company_name}\n
<b>${APPEAL_DETAILS[user.language][4]}</b> ${user.name}\n
<b>${APPEAL_DETAILS[user.language][5]}</b> ${appeal.text}\n
<b>${APPEAL_DETAILS[user.language][6]}</b> ${appeal.importance_level}\n
<b>${APPEAL_DETAILS[user.language][7]}</b> ${formatDateTime(new Date(appeal.updatedAt))}`;

      await this.bot.telegram.sendMessage(GROUP_ID, messageText, {
        parse_mode: 'HTML',
      });
      for (const msg of appeal.media) {
        if (msg.key === 'file') {
          await this.bot.telegram.sendDocument(GROUP_ID, msg.file_name);
        } else if (msg.key === 'photo') {
          await this.bot.telegram.sendPhoto(GROUP_ID, msg.file_name);
        } else if (msg.key === 'video') {
          await this.bot.telegram.sendVideo(GROUP_ID, msg.file_name);
        } else {
          await this.bot.telegram.sendVoice(GROUP_ID, msg.file_name);
        }
      }

      //------------Send to Clinet----------------//
      const customer = await this.customersModel.findOne({
        where: { customer_id: appeal.sap_id },
      });

      await this.bot.telegram.sendMessage(
        customer.customer_group_id,
        messageText,
        { parse_mode: 'HTML' },
      );
      for (const msg of appeal.media) {
        if (msg.key === 'file') {
          await this.bot.telegram.sendDocument(
            customer.customer_group_id,
            msg.file_name,
          );
        } else if (msg.key === 'photo') {
          await this.bot.telegram.sendPhoto(
            customer.customer_group_id,
            msg.file_name,
          );
        } else if (msg.key === 'video') {
          await this.bot.telegram.sendVideo(
            customer.customer_group_id,
            msg.file_name,
          );
        } else {
          await this.bot.telegram.sendVoice(
            customer.customer_group_id,
            msg.file_name,
          );
        }
      }
    } catch (error) {
      console.log('onAppealImportance', error);
    }
  }

  async onSend(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);

      if (user && user.last_step === 'media_appeal') {
        await user.update({ last_step: 'importance_appeal' });

        // Inline tugmalar bilan yangi xabar
        await ctx.reply(CHOOSE_IMPOERTANCE[user.language], {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: IMPORTANCE_LEVEL[user.language][0],
                  callback_data: 'importance_LOW',
                },
              ],
              [
                {
                  text: IMPORTANCE_LEVEL[user.language][1],
                  callback_data: 'importance_MEDIUM',
                },
              ],
              [
                {
                  text: IMPORTANCE_LEVEL[user.language][2],
                  callback_data: 'importance_HIGH',
                },
              ],
            ],
          },
        });
      } else if (
        user &&
        user.last_step !== 'media_appeal' &&
        user.last_step.split('_')[0] === 'media'
      ) {
        const appeal = await this.appealsModel.findByPk(
          +user.last_step.split('_')[1],
        );
        await user.update({ last_step: 'finish' });

        const formatDateTime = (date: Date): string => {
          return new Intl.DateTimeFormat('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false, // 24 soatlik format
          })
            .format(date)
            .replace(/\//g, '.')
            .replace(',', '');
        };

        // let messageText = `${appeal.id} - murjaat o'zgartirildi\nUser ID: ${userId}\nSAP ID: ${appeal.sap_id}\nCompany name: ${user.company_name}\nUser name: ${user.name}\nMurojaat matni: ${appeal.text}\nMuhimlilik: ${appeal.importance_level}\nMurojaat vaqti: ${formatDateTime(new Date(appeal.updatedAt))}`;
        let messageText = `<b>${appeal.id} - ${NEW_OR_UPDATED_APPEAL[user.language][1]}</b>\n
<b>${APPEAL_DETAILS[user.language][1]}</b> ${userId}\n
<b>${APPEAL_DETAILS[user.language][2]}</b> ${appeal.sap_id}\n
<b>${APPEAL_DETAILS[user.language][3]}</b> ${user.company_name}\n
<b>${APPEAL_DETAILS[user.language][4]}</b> ${user.name}\n
<b>${APPEAL_DETAILS[user.language][5]}</b> ${appeal.text}\n
<b>${APPEAL_DETAILS[user.language][6]}</b> ${appeal.importance_level}\n
<b>${APPEAL_DETAILS[user.language][7]}</b> ${formatDateTime(new Date(appeal.updatedAt))}`;

        await this.bot.telegram.sendMessage(GROUP_ID, messageText, {
          parse_mode: 'HTML',
        });
        for (const msg of appeal.media) {
          if (msg.key === 'file') {
            await this.bot.telegram.sendDocument(GROUP_ID, msg.file_name);
          } else if (msg.key === 'photo') {
            await this.bot.telegram.sendPhoto(GROUP_ID, msg.file_name);
          } else if (msg.key === 'video') {
            await this.bot.telegram.sendVideo(GROUP_ID, msg.file_name);
          } else {
            await this.bot.telegram.sendVoice(GROUP_ID, msg.file_name);
          }
        }

        await ctx.reply(APPEAL_EDITED[user.language], {
          parse_mode: 'HTML',
          ...Markup.keyboard(
            chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
          ).resize(),
        });

        //--------------Send to Client---------------//
        const customer = await this.customersModel.findOne({
          where: { customer_id: user.sap_id },
        });
        await this.bot.telegram.sendMessage(
          customer.customer_group_id,
          messageText,
          { parse_mode: 'HTML' },
        );
        for (const msg of appeal.media) {
          if (msg.key === 'file') {
            await this.bot.telegram.sendDocument(
              customer.customer_group_id,
              msg.file_name,
            );
          } else if (msg.key === 'photo') {
            await this.bot.telegram.sendPhoto(
              customer.customer_group_id,
              msg.file_name,
            );
          } else if (msg.key === 'video') {
            await this.bot.telegram.sendVideo(
              customer.customer_group_id,
              msg.file_name,
            );
          } else {
            await this.bot.telegram.sendVoice(
              customer.customer_group_id,
              msg.file_name,
            );
          }
        }
      }
    } catch (error) {
      console.log('onSend', error);
    }
  }

  async onEditAppeal(ctx: Context, page = 1) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);

      const pageSize = 10; // Har sahifada nechta murojaat chiqishini belgilaymiz
      const offset = (page - 1) * pageSize; // Qaysi murojaatdan boshlab olishni hisoblaymiz

      const { count, rows: appeals } = await this.appealsModel.findAndCountAll({
        where: { sap_id: user.sap_id, status: Status.WAITING },
        limit: pageSize,
        offset: offset,
      });

      if (appeals.length > 0) {
        await user.update({ last_step: 'edit' });
        const appeal_buttons = appeals.map((appeal) => [
          Markup.button.callback(
            `${appeal.id}. ${appeal.text}`,
            `appeal_${appeal.id}`,
          ),
        ]);

        // Sahifalash (pagination) tugmalari
        const pagination_buttons = [];
        if (offset > 0) {
          pagination_buttons.push(
            Markup.button.callback('⬅️', `page_${page - 1}`),
          );
        }
        if (offset + pageSize < count) {
          pagination_buttons.push(
            Markup.button.callback('➡️', `page_${page + 1}`),
          );
        }

        const chooseAppealMessage = await ctx.reply(
          CHOOSE_APPPEAL[user.language],
          {
            parse_mode: 'HTML',
            ...Markup.keyboard([[BACT_TO_MENU[user.language]]]),
          },
        );

        // Birinchi xabarning message_id sini olish
        const chooseAppealMessageId = chooseAppealMessage.message_id;

        const appealsMessage = await ctx.reply(APPEALS[user.language], {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([...appeal_buttons, pagination_buttons]),
        });

        // Ikkinchi xabarning message_id sini olish
        const appealsMessageId = appealsMessage.message_id;

        await this.temporaryDateModel.create({
          user_id: userId,
          date: [chooseAppealMessageId, appealsMessageId],
        });
      } else {
        await ctx.reply(NO_APPEALS[user.language]);
      }
    } catch (error) {
      console.log('onEditAppeal', error);
    }
  }

  async loadAppealsPage(ctx: Context, page: number) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);
      if (user.last_step !== 'edit') return;
      const pageSize = 10; // Har sahifada nechta murojaat ko‘rsatilishini belgilash

      const { appeals, totalPages } = await this.getAppealsByPage(
        user.sap_id,
        page,
        pageSize,
      );

      if (appeals.length === 0) {
        return await ctx.editMessageText(NO_APPEALS[user.language]);
      }

      const appealButtons = appeals.map((appeal) => [
        Markup.button.callback(
          `${appeal.id}. ${appeal.text}`,
          `appeal_${appeal.id}`,
        ),
      ]);

      const navigationButtons = [];
      if (page > 1) {
        navigationButtons.push(
          Markup.button.callback('⬅️', `page_${page - 1}`),
        );
      }
      if (page < totalPages) {
        navigationButtons.push(
          Markup.button.callback('➡️', `page_${page + 1}`),
        );
      }

      await ctx.editMessageText(APPEALS[user.language], {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([...appealButtons, navigationButtons]),
      });
    } catch (error) {
      console.error('loadAppealsPage error:', error);
    }
  }

  async getAppealsByPage(sapId: number, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const { count, rows } = await this.appealsModel.findAndCountAll({
      where: { sap_id: sapId, status: Status.WAITING },
      limit: pageSize,
      offset,
    });

    return { appeals: rows, totalPages: Math.ceil(count / pageSize) };
  }

  async onChooseAppeal(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findOne({ where: { user_id: userId } });
      if (user && user.last_step === 'edit') {
        const appeal = await this.appealsModel.findByPk(
          ctx.callbackQuery['data'].split('_')[1],
        );
        if (user.last_step === 'edit') {
          const messagesId = await this.temporaryDateModel.findOne({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']], // Eng oxirgi yozuvni olish
          });

          if (messagesId) {
            await ctx.deleteMessages(messagesId.date);
            await messagesId.destroy();
          }
        }

        if (appeal) {
          await user.update({
            last_step: `edit_${ctx.callbackQuery['data'].split('_')[1]}`,
          });
          await ctx.reply(appeal.text);
          if (appeal.media.length) {
            for (const media of appeal.media) {
              if (media.key === 'file') {
                await ctx.sendDocument(media.file_name);
              } else if (media.key === 'photo') {
                await ctx.sendPhoto(media.file_name);
              } else if (media.key === 'video') {
                await ctx.sendVideo(media.file_name);
              } else {
                await ctx.sendVoice(media.file_name);
              }
            }
          }

          await ctx.reply(EDIT_APPEAL[user.language], {
            parse_mode: 'HTML',
            ...Markup.keyboard([[BACT_TO_MENU[user.language]]]).resize(),
          });
        } else {
          ctx.reply(APPEAL_NOT_FOUND[user.language]);
        }
      }
    } catch (error) {
      console.log('onChooseAppeal: ', error);
    }
  }

  async onViewAllAppeals(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findOne({ where: { user_id: userId } });
      const appeals = await this.appealsModel.findAll({
        where: { user_id: userId },
      });

      const reportsDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Appeals List');

      worksheet.columns = [
        { header: `${APPEAL_ID[user.language]}`, key: 'id', width: 12 },
        {
          header: EMPLOYEE_NAME[user.language],
          key: 'employee_name',
          width: 20,
        },
        { header: `${APPEAL_TEXT[user.language]}`, key: 'text', width: 100 }, // Matn uchun kengroq joy ajratildi
        { header: `${STATUS_APPEAL[user.language]}`, key: 'status', width: 15 },
        { header: `${DATE_APPEAL[user.language]}`, key: 'date', width: 20 },
        {
          header: ANSWERED_TIME[user.language],
          key: 'answered_time',
          width: 20,
        },
      ];

      // Headerlarni formatlash
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      appeals.forEach((appeal) => {
        const status_appeal =
          appeal.status === Status.WAITING
            ? NO_ANSWERED[user.language]
            : ANSWERED[user.language];

        const formatDateTime = (date: Date): string => {
          if (date) {
            return new Intl.DateTimeFormat('uz-UZ', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
              .format(date)
              .replace(/\//g, '.')
              .replace(',', '');
          } else {
            return '-';
          }
        };

        const row = worksheet.addRow({
          id: appeal.id,
          text: appeal.text,
          status: status_appeal,
          date: formatDateTime(appeal.updatedAt),
          employee_name: appeal.name,
          answered_time: formatDateTime(appeal.answered_time),
        });

        // **Text ustuniga wrapText qo‘shish**
        row.getCell('text').alignment = { wrapText: true };

        // **Text uzunligiga qarab qator balandligini o‘zgartirish**
        const textLength = appeal.text.length;
        row.height = textLength > 100 ? 40 : textLength > 50 ? 30 : 20;
      });

      const fileName = `appeal_report_${Date.now()}.xlsx`;
      const filePath = path.join(reportsDir, fileName);

      await workbook.xlsx.writeFile(filePath);
      await ctx.replyWithDocument({ source: filePath });

      fs.unlinkSync(filePath);
    } catch (error) {
      console.log('onViewAllAppeals: ', error);
    }
  }

  async onLetThemCall(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const generateId = (): number => {
        const timestamp = Number(Date.now().toString().slice(-5)); // Oxirgi 5 ta raqamni number qilish
        const randomPart = Math.floor(100 + Math.random() * 900); // 3 xonali tasodifiy son
        return timestamp * 1000 + randomPart; // Natijani raqamga aylantirish
      };

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);

      const newCall = await this.callsModel.create({
        id: generateId(),
        user_id: userId,
        phone: user.phone,
        company_name: user.company_name,
        name: user.name,
        sap_id: user.sap_id,
      });

      const formatDateTime = (date: Date): string => {
        return new Intl.DateTimeFormat('uz-UZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false, // 24 soatlik format
        })
          .format(date)
          .replace(/\//g, '.')
          .replace(',', '');
      };

      const messageText =
        `<b>${CALL_DETAILS[user.language][0]}</b>\n` +
        `<b>${CALL_DETAILS[user.language][1]}</b> ${newCall.id}\n` +
        `<b>${CALL_DETAILS[user.language][2]}</b> ${user.user_id}\n` +
        `<b>${CALL_DETAILS[user.language][3]}</b> ${user.sap_id}\n` +
        `<b>${CALL_DETAILS[user.language][4]}</b> ${user.company_name}\n` +
        `<b>${CALL_DETAILS[user.language][5]}</b> ${user.name}\n` +
        `<b>${CALL_DETAILS[user.language][6]}</b> ${user.phone}\n` +
        `<b>${CALL_DETAILS[user.language][7]}</b> ${formatDateTime(newCall.createdAt)}`;

      await this.bot.telegram.sendMessage(GROUP_ID, messageText, {
        parse_mode: 'HTML',
      });

      await ctx.reply(
        `<b>${SUCCESSED_CALL_APPEAL[user.language][0]}</b>\n` +
          `<b>${SUCCESSED_CALL_APPEAL[user.language][1]}</b> - ${newCall.id}\n` +
          `<b>${SUCCESSED_CALL_APPEAL[user.language][2]}</b>`,
        { parse_mode: 'HTML' },
      );

      //---------------Send to Client----------------//
      const customer = await this.customersModel.findOne({
        where: { customer_id: user.sap_id },
      });

      await this.bot.telegram.sendMessage(
        customer.customer_group_id,
        messageText,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      console.log('onLetThemCall: ', error);
    }
  }

  async onSetLanguage(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      await ctx.reply(`Tilni tanlang.\n\nВыберите язык.`, {
        parse_mode: 'HTML',
        ...Markup.keyboard([["🇺🇿O'zbekcha", '🇷🇺Русский']]).resize(),
      });
    } catch (error) {
      console.log('onSetLanguage: ', error);
    }
  }

  async onAddAppeal(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);
      const appeal = await this.appealsModel.findByPk(
        user.last_step.split('_')[1],
      );
      if (user.last_step.split('_')[0] === 'edit') {
        if ('text' in ctx.message) {
          await user.update({
            last_step: `media_${user.last_step.split('_')[1]}`,
          });
          await appeal.update({
            text: `${appeal.text}\n---------------------\n${ctx.message.text}`,
          });

          await ctx.reply(SEND_MEDIA[user.language], {
            parse_mode: 'HTML',
            ...Markup.keyboard([[SEND_BUTTON[user.language]]]),
          });
        }
      } else if (user.last_step.split('_')[0] === 'media') {
        if ('document' in ctx.message) {
          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'file',
                file_name: ctx.message.document.file_id,
              },
            ],
          });
        } else if ('photo' in ctx.message) {
          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'photo',
                file_name: ctx.message.photo[3].file_id,
              },
            ],
          });
        } else if ('voice' in ctx.message) {
          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'voice',
                file_name: ctx.message.voice.file_id,
              },
            ],
          });
        } else if ('video' in ctx.message) {
          await appeal.update({
            media: [
              ...(appeal.media || []),
              {
                key: 'video',
                file_name: ctx.message.video.file_id,
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('onAddAppeal: ', error);
    }
  }

  async onBackToMenu(ctx: Context) {
    try {
      if (ctx.chat.id < 0) return;

      const userId = ctx.from.id;
      const user = await this.botModel.findByPk(userId);
      const order = await this.appealsModel.findOne({
        where: { user_id: userId, status: Status.ORDERING },
      });
      if (order) {
        await order.destroy();
      }

      if (user.last_step === 'edit') {
        const messagesId = await this.temporaryDateModel.findOne({
          where: { user_id: userId },
          order: [['createdAt', 'DESC']], // Eng oxirgi yozuvni olish
        });

        if (messagesId) {
          await ctx.deleteMessages(messagesId.date);
          await messagesId.destroy();
        }
      }

      await user.update({ last_step: 'finish' });

      await ctx.reply(MAIN_MENU[user.language], {
        parse_mode: 'HTML',
        ...Markup.keyboard(
          chunkArray(MAIN_MENU_BUTTONS[user.language], 2),
        ).resize(),
      });
    } catch (error) {
      console.log('onBackToMenu: ', error);
    }
  }
}
