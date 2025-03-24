import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ADMINS, GROUP_ID } from 'src/app.constants';
import { Appeals, Status } from 'src/appeal/models/appeal.model';
import { Context, Markup } from 'telegraf';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { Calls } from 'src/appeal/models/calls.model';

@Injectable()
export class AdminServise {
  constructor(
    @InjectModel(Appeals) private readonly appealsModel: typeof Appeals,
    @InjectModel(Calls) private readonly callsModel: typeof Calls,
  ) {}

  async onAdminReply(ctx: Context) {
    try {
      const adminIds = ADMINS;
      if (!adminIds.includes(ctx.from.id)) return; // Faqat admin reply bera oladi
      const message = ctx.message as any;
      if (!message.reply_to_message) {
        return ctx.reply(
          '❌ Xatolik: Iltimos, foydalanuvchining xabariga reply qiling.',
        );
      }

      const repliedMessage = message.reply_to_message;
      const match = repliedMessage.text?.match(/User ID: (\d+)/);
      const appealId = parseInt(
        repliedMessage.text?.match(/Murojaat ID:\s*(\d+)/)[1],
      );

      await this.appealsModel.update(
        { status: Status.ANSWERED, answered_time: new Date() },
        { where: { id: appealId } },
      );

      if (!match) {
        return ctx.reply('❌ Xatolik: Foydalanuvchi ID sini topib bo‘lmadi.');
      }

      const userId = parseInt(match[1]); // ID ni olish

      // 1️⃣ **Foydalanuvchi bilan chat bormi, tekshiramiz**
      const chat = await ctx.telegram.getChat(userId).catch(() => null);
      if (!chat) {
        return ctx.reply(
          `❌ Xatolik: Foydalanuvchi (${userId}) bot bilan chat boshlamagan.`,
        );
      }

      // 2️⃣ **Foydalanuvchiga xabar yuborish (text, document, voice, video)**
      if (message.text) {
        await ctx.telegram.sendMessage(
          userId,
          `<b>SAP Business one</b>\n${message.text}`,
          { parse_mode: 'HTML' },
        );
      } else if (message.document) {
        await ctx.telegram.sendDocument(userId, message.document.file_id);
      } else if (message.voice) {
        await ctx.telegram.sendVoice(userId, message.voice.file_id);
      } else if (message.video) {
        await ctx.telegram.sendVideo(userId, message.video.file_id);
      } else if (message.photo) {
        await ctx.telegram.sendPhoto(userId, message.photo[3].file_id);
      } else {
        return ctx.reply(
          '❌ Xatolik: Ushbu xabar turi qo‘llab-quvvatlanmaydi.',
        );
      }

      await ctx.reply('✅ Xabar foydalanuvchiga yuborildi.');
    } catch (error) {
      await ctx.reply('❌ Xatolik: Xabar foydalanuvchiga yuborilmadi.');
    }
  }

  async onCommandAdmin(ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      ctx.reply('Xush kelibsiz', {
        parse_mode: 'HTML',
        ...Markup.keyboard([
          ['Hisobot', "Qo'ng'iroqlar"],
          ['Javob berilmagan murojaatlar'],
        ]).resize(),
      });
    }
  }

  async onReportAdmin(ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      const appeals = await this.appealsModel.findAll();

      const adminReportsDir = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(adminReportsDir)) {
        fs.mkdirSync(adminReportsDir, { recursive: true });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report List');

      worksheet.columns = [
        { header: `ID`, key: 'id', width: 9 },
        {
          header: 'SAP ID',
          key: 'sap_id',
          width: 9,
        },
        {
          header: 'Company name',
          key: 'company_name',
          width: 25,
        },
        { header: 'Name', key: 'name', width: 25 },
        { header: `Murojaat matni`, key: 'text', width: 100 }, // Matn uchun kengroq joy ajratildi
        { header: `Muhimlilik`, key: 'importance', width: 11 },

        { header: 'Murojaat vaqti', key: 'appeal_time', width: 18 },
        { header: `Holati`, key: 'status', width: 17 },
        {
          header: 'Javob berilgan vaqt',
          key: 'answered_time',
          width: 16,
        },
      ];

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
            ? 'Javob berilmagan'
            : 'Javob berilgan';

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
          sap_id: appeal.sap_id,
          company_name: appeal.company_name,
          name: appeal.name,
          text: appeal.text,
          importance: appeal.importance_level,
          appeal_time: formatDateTime(appeal.updatedAt),
          status: status_appeal,
          answered_time: formatDateTime(appeal.answered_time),
        });

        // **Text ustuniga wrapText qo‘shish**
        row.getCell('text').alignment = { wrapText: true };

        // **Text uzunligiga qarab qator balandligini o‘zgartirish**
        const textLength = appeal.text.length;
        row.height = textLength > 100 ? 40 : textLength > 50 ? 30 : 20;
      });

      const fileName = `admin_report_${Date.now()}.xlsx`;
      const filePath = path.join(adminReportsDir, fileName);

      await workbook.xlsx.writeFile(filePath);
      await ctx.replyWithDocument({ source: filePath });

      fs.unlinkSync(filePath);
    }
  }

  async onCalls(ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      const calls = await this.callsModel.findAll();

      const callsReport = path.join(__dirname, '..', 'tmp');
      if (!fs.existsSync(callsReport)) {
        fs.mkdirSync(callsReport, { recursive: true });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Calls List');

      worksheet.columns = [
        { header: `ID`, key: 'id', width: 9 },
        {
          header: 'SAP ID',
          key: 'sap_id',
          width: 9,
        },
        {
          header: 'Company name',
          key: 'company_name',
          width: 25,
        },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Tlelfon raqam', key: 'phone', width: 15 },
        { header: 'Murojaat vaqti', key: 'appeal_time', width: 18 },
      ];

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

      calls.forEach((call) => {
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
          id: call.id,
          sap_id: call.sap_id,
          company_name: call.company_name,
          name: call.name,
          phone: call.phone,
          appeal_time: formatDateTime(call.createdAt),
        });

        // Ustun indeksini aniq belgilaymiz (bu yerda 'name' ustuni 4-ustun bo‘lishi mumkin)
        const nameColumnIndex = 4; // 'name' ustuni qaysi indexda ekanligini tekshiring

        // Ustun mavjudligini tekshiramiz va keyin kenglikni o‘zgartiramiz
        const nameColumn = worksheet.getColumn(nameColumnIndex);
        if (nameColumn) {
          nameColumn.width = call.name.length > 25 ? call.name.length + 10 : 25;
        } else {
          console.error(`Ustun topilmadi: index ${nameColumnIndex}`);
        }
      });

      const fileName = `admin_report_${Date.now()}.xlsx`;
      const filePath = path.join(callsReport, fileName);

      await workbook.xlsx.writeFile(filePath);
      await ctx.replyWithDocument({ source: filePath });

      fs.unlinkSync(filePath);
    }
  }

  async onNotAnsweredAppeals(ctx: Context, page = 1) {
    try {
      const pageSize = 10;
      const offset = (page - 1) * pageSize;

     const { count, rows: appeals } = await this.appealsModel.findAndCountAll({
       where: { status: Status.WAITING },
       limit: pageSize,
       offset: offset,
       order: [['updatedAt', 'ASC']], // updatedAt bo‘yicha o‘sish tartibida saralash
     });


      if (appeals.length > 0) {
        let textMessage = '<b>Murojaatlar:</b>';

        // Tugmalarni to'g'ri formatda yaratish
        const appeal_buttons = appeals.map((appeal) => {
          textMessage += `\n<b>${appeal.id}.</b> ${appeal.company_name}, muhimlilik: <b>${appeal.importance_level}</b>`;
          return [
            Markup.button.callback(
              `${appeal.id}. ${appeal.company_name}`,
              `not_answered_appeal_${appeal.id}`,
            ),
          ];
        });

        // Sahifalash (pagination) tugmalari
        const pagination_buttons = [];
        if (offset > 0) {
          pagination_buttons.push(
            Markup.button.callback('⬅️', `not_answered_page_${page - 1}`),
          );
        }
        if (offset + pageSize < count) {
          pagination_buttons.push(
            Markup.button.callback('➡️', `not_answered_page_${page + 1}`),
          );
        }

        // Tugmalarni inline keyboard ichiga joylash
        await ctx.reply(textMessage, {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            ...appeal_buttons,
            pagination_buttons.length ? pagination_buttons : [],
          ]).reply_markup, // ✅ Markup obyektining reply_markup qismini olish kerak
        });
      } else {
        ctx.reply("Javob berilmagan murojaatlar yo'q");
      }
    } catch (error) {
      console.log('onNotAnsweredAppeals ERROR: ', error);
    }
  }

  async loadAppealsPage(ctx: Context, page: number) {
    try {
      const pageSize = 10; // Har sahifada nechta murojaat ko‘rsatilishini belgilash

      const { appeals, totalPages } = await this.getAppealsByPage(
        page,
        pageSize,
      );

      if (appeals.length === 0) {
        return await ctx.editMessageText("Ma'lumot topilmadi");
      }

      let messageText = `Murojaatlar:`;
      const appeal_buttons = appeals.map((appeal) => {
        messageText += `\n<b>${appeal.id}.</b> ${appeal.company_name}, muhimlilik: <b>${appeal.importance_level}</b>`;
        return [
          Markup.button.callback(
            `${appeal.id}. ${appeal.company_name}`,
            `not_answered_appeal_${appeal.id}`,
          ),
        ];
      });

      const navigationButtons = [];
      if (page > 1) {
        navigationButtons.push(
          Markup.button.callback('⬅️', `not_answered_page_${page - 1}`),
        );
      }
      if (page < totalPages) {
        navigationButtons.push(
          Markup.button.callback('➡️', `not_answered_page_${page + 1}`),
        );
      }

      await ctx.editMessageText(messageText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([...appeal_buttons, navigationButtons]),
      });
    } catch (error) {
      console.error('loadAppealsPage error:', error);
    }
  }

  async getAppealsByPage(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const { count, rows } = await this.appealsModel.findAndCountAll({
      where: { status: Status.WAITING },
      limit: pageSize,
      offset: offset,
    });

    return { appeals: rows, totalPages: Math.ceil(count / pageSize) };
  }

  async onChooseNotAnsweredAppeal(ctx: Context) {
    try {
      const appeal = await this.appealsModel.findByPk(
        ctx.callbackQuery['data'].split('_')[3],
      );

      if (appeal) {
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

        let messageText = `<b>Yangi murojaat</b>\n
<b>Murojaat ID:</b> ${appeal.id}\n
<b>User ID:</b> ${appeal.user_id}\n
<b>SAP ID:</b> ${appeal.sap_id}\n
<b>Company name:</b> ${appeal.company_name}\n
<b>User name:</b> ${appeal.name}\n
<b>Murojaat matni:</b> ${appeal.text}\n
<b>Muhimlilik:</b> ${appeal.importance_level}\n
<b>Murojaat vaqti:</b> ${formatDateTime(new Date(appeal.updatedAt))}`;

        await ctx.reply(messageText, { parse_mode: 'HTML' });

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
      } else {
        ctx.reply("Ma'lumot topilmadi");
      }
    } catch (error) {
      console.log('onChooseAppeal: ', error);
    }
  }
}
