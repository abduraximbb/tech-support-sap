import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ADMINS, GROUP_ID } from 'src/app.constants';
import { Appeals, Status } from 'src/appeal/models/appeal.model';
import { Context, Markup } from 'telegraf';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { Calls } from 'src/appeal/models/calls.model';
import { TemporaryCustomersIds } from './models/temporary-customers-id.model';
import {
  APPEAL_DETAILS,
  APPEAL_NUMBER,
  CALL_DETAILS,
  IS_SATISFACTORY,
  YES_OR_NO,
} from 'src/language_data';
import { Bot } from 'src/bot/models/bot.model';
import { AdminSteps } from './models/admin-steps.model';
import { Customers } from './models/customer.model';

@Injectable()
export class AdminServise {
  constructor(
    @InjectModel(Appeals) private readonly appealsModel: typeof Appeals,
    @InjectModel(Calls) private readonly callsModel: typeof Calls,
    @InjectModel(TemporaryCustomersIds)
    private readonly temporaryCustomersIdsModel: typeof TemporaryCustomersIds,
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectModel(AdminSteps)
    private readonly adminStepsModel: typeof AdminSteps,
    @InjectModel(Customers) private readonly customersModel: typeof Customers,
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
      let match = repliedMessage.text?.match(/User ID: (\d+)/);
      if (!match) {
        match = repliedMessage.text?.match(/Пользователя ID: (\d+)/);
      }

      let appealMatch = repliedMessage.text?.match(/Murojaat ID: \s*(\d+)/);
      if (!appealMatch) {
        appealMatch = repliedMessage.text?.match(/Oбращения ID: \s*(\d+)/);
      }

      if (!match) {
        return ctx.reply('❌ Xatolik: Foydalanuvchi ID sini topib bo‘lmadi.');
      }

      if (!appealMatch) {
        return ctx.reply('❌ Xatolik: Murojaat ID sini topib bo‘lmadi.');
      }

      const userId = parseInt(match[1]); // ID ni olish
      const user = await this.botModel.findOne({ where: { user_id: userId } });
      const appealId = parseInt(appealMatch[1]); // Appeal ID ni olish

      const appeal = await this.appealsModel.findByPk(appealId);
      if (appeal && !appeal.answered_time) {
        await appeal.update({ answered_time: new Date() });
      }

      const temporaryIds = await this.temporaryCustomersIdsModel.findOne({
        where: { customer_id: userId, admin_id: ctx.from.id },
      });

      if (!temporaryIds) {
        await this.temporaryCustomersIdsModel.create({
          admin_id: ctx.from.id,
          customer_id: userId,
          appeal_id: appeal.id,
        });
      }

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
          `<b>SAP Business One</b>\n\n${APPEAL_NUMBER[user.language]} ${appeal.id}\n\n${message.text}`,
          { parse_mode: 'HTML' },
        );
      } else if (message.document) {
        await ctx.telegram.sendDocument(userId, message.document.file_id);
      } else if (message.voice) {
        await ctx.telegram.sendVoice(userId, message.voice.file_id);
      } else if (message.video) {
        await ctx.telegram.sendVideo(userId, message.video.file_id);
      } else if (message.photo) {
        // Eng katta hajmli rasmni yuborish
        const largestPhoto = message.photo[message.photo.length - 1].file_id;
        await ctx.telegram.sendPhoto(userId, largestPhoto);
      } else {
        return ctx.reply(
          '❌ Xatolik: Ushbu xabar turi qo‘llab-quvvatlanmaydi.',
        );
      }

      await ctx.reply('✅ Xabar foydalanuvchiga yuborildi.');
    } catch (error) {
      console.error('Xatolik:', error);
      await ctx.reply('❌ Xatolik: Xabar foydalanuvchiga yuborilmadi.');
    }
  }

  async onCommandAdmin(ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      const exist_admin_step = await this.adminStepsModel.findOne({
        where: { admin_id: ctx.from.id },
      });
      if (exist_admin_step) {
        await exist_admin_step.destroy();
      }

      await ctx.reply('Xush kelibsiz', {
        parse_mode: 'HTML',
        ...Markup.keyboard([
          ['Murojaatni yakunlash'],
          ['Hisobot', "Qo'ng'iroqlar"],
          ['Javob berilmagan murojaatlar', "Yangi mijoz qo'shish"],
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
        { header: "Qo'yilgan baho", key: 'answer_bal', width: 17 },
        { header: 'Murojaat vaqti', key: 'appeal_time', width: 18 },
        { header: `Holati`, key: 'status', width: 17 },
        {
          header: 'Javob berilgan vaqt',
          key: 'answered_time',
          width: 18,
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
        let status_appeal =
          appeal.status === Status.WAITING
            ? 'Javob berilmagan'
            : appeal.text === CALL_DETAILS.uz[0] ||
                appeal.text === CALL_DETAILS.ru[0]
              ? '-'
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
          answer_bal: appeal.answer_bal,
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
          reply_markup: {
            inline_keyboard: [
              ...appeal_buttons,
              ...(pagination_buttons.length ? [pagination_buttons] : []),
            ],
            resize_keyboard: true, // ❌ bu inline klaviatura uchun ishlamaydi
          },
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

  async onCompleteAppeal(ctx: Context) {
    try {
      const temporary_customers_id =
        await this.temporaryCustomersIdsModel.findOne({
          where: { admin_id: ctx.from.id },
          order: [['createdAt', 'DESC']], // Eng oxirgi yozuvni olish
        });

      if (!temporary_customers_id) {
        await ctx.reply("Yakunlash kerak bo'lgan murojaat yoq");
        return;
      }

      const user = await this.botModel.findByPk(
        temporary_customers_id.customer_id,
      );

      await ctx.telegram.sendMessage(
        user.user_id,
        `${IS_SATISFACTORY[user.language]}\n${APPEAL_NUMBER[user.language]} ${temporary_customers_id.appeal_id}`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.keyboard([
            [YES_OR_NO[user.language][0], YES_OR_NO[user.language][1]],
          ]).resize().reply_markup, // <<< BU MUHIM!
        },
      );

      await ctx.reply(
        `${temporary_customers_id.appeal_id} - murojaatga yakunlash haqida so'rov jo'natildi`,
      );
    } catch (error) {
      console.log('onCompleteAppeal: ', error);
    }
  }

  async onAddNewCustomer(ctx: Context) {
    try {
      await ctx.reply('Kampaniya rasmiy nomini kiriting:', {
        parse_mode: 'HTML',
        ...Markup.keyboard(['Menyuga qaytish']).resize(),
      });

      const exist_admin_step = await this.adminStepsModel.findOne({
        where: { admin_id: ctx.from.id },
      });
      if (exist_admin_step && exist_admin_step.last_step !== 'finish') {
        await exist_admin_step.destroy();
      }

      await this.adminStepsModel.create({
        admin_id: ctx.from.id,
        last_step: 'add_new_cus',
      });
    } catch (error) {
      console.log('onAddNewCustomer: ', error);
    }
  }

  async onBackToAdminMenu(ctx: Context) {
    try {
      if (ADMINS.includes(ctx.from.id)) {
        ctx.reply('Xush kelibsiz', {
          parse_mode: 'HTML',
          ...Markup.keyboard([
            ['Murojaatni yakunlash'],
            ['Hisobot', "Qo'ng'iroqlar"],
            ['Javob berilmagan murojaatlar', "Yangi mijoz qo'shish"],
          ]).resize(),
        });

        const exist_admin_step = await this.adminStepsModel.findOne({
          where: { admin_id: ctx.from.id },
        });

        if (exist_admin_step) {
          await exist_admin_step.destroy();
        }
      }
    } catch (error) {
      console.log('onBackToAdminMenu: ', error);
    }
  }

  async onAddCompanyName(ctx: Context) {
    try {
      if ('text' in ctx.message) {
        const exist_admin_step = await this.adminStepsModel.findOne({
          where: { admin_id: ctx.from.id },
        });
        if (exist_admin_step && exist_admin_step.last_step === 'add_new_cus') {
          const newCustomer = await this.customersModel.create({
            customer_name: ctx.message.text,
          });

          await exist_admin_step.update({
            last_step: 'company_name',
            customer_id: newCustomer.dataValues.id,
          });

          await ctx.reply('Brand nomini kiriting:', {
            parse_mode: 'HTML',
            ...Markup.keyboard(['Menyuga qaytish']).resize(),
          });
        }
      }
    } catch (error) {
      console.log('onAddCompanyName: ', error);
    }
  }

  async onAddCompanyShortName(ctx: Context) {
    try {
      if ('text' in ctx.message) {
        const exist_admin_step = await this.adminStepsModel.findOne({
          where: { admin_id: ctx.from.id },
        });

        if (exist_admin_step && exist_admin_step.last_step === 'company_name') {
          await this.customersModel.update(
            { short_name: ctx.message.text },
            { where: { id: exist_admin_step.customer_id } },
          );

          await exist_admin_step.update({ last_step: 'brand_name' });

          await ctx.reply('SAP tomonidan berilgan ID ni kiriting:', {
            parse_mode: 'HTML',
            ...Markup.keyboard(['Menyuga qaytish']).resize(),
          });
        }
      }
    } catch (error) {
      console.log('onAddCompanyShortName: ', error);
    }
  }

  async onAddSapId(ctx: Context) {
    try {
      if ('text' in ctx.message) {
        if (isNaN(+ctx.message.text)) {
          await ctx.reply('Xato ID kiritildi');
          return;
        }

        const exist_admin_step = await this.adminStepsModel.findOne({
          where: { admin_id: ctx.from.id },
        });

        if (exist_admin_step && exist_admin_step.last_step === 'brand_name') {
          await this.customersModel.update(
            { customer_id: +ctx.message.text },
            { where: { id: exist_admin_step.customer_id } },
          );

          await exist_admin_step.update({ last_step: 'group_id' });

          await ctx.reply('Telegram guruh ID ni kiriting:', {
            parse_mode: 'HTML',
            ...Markup.keyboard(['Menyuga qaytish']).resize(),
          });
        }
      }
    } catch (error) {
      console.log('onAddCompanyShortName: ', error);
    }
  }

  async onAddGroupId(ctx: Context) {
    try {
      if ('text' in ctx.message) {
        const groupId = +ctx.message.text.trim();
        if (isNaN(groupId)) {
          await ctx.reply('Xato ID kiritildi');
          return;
        }

        const exist_admin_step = await this.adminStepsModel.findOne({
          where: { admin_id: ctx.from.id },
        });

        if (exist_admin_step && exist_admin_step.last_step === 'group_id') {
          await this.customersModel.update(
            { customer_group_id: +groupId },
            { where: { id: exist_admin_step.customer_id } },
          );

          await exist_admin_step.destroy();

          await ctx.reply("Yangi mijoz muvaffaqiyatli qo'shildi", {
            parse_mode: 'HTML',
            ...Markup.keyboard([
              ['Murojaatni yakunlash'],
              ['Hisobot', "Qo'ng'iroqlar"],
              ['Javob berilmagan murojaatlar', "Yangi mijoz qo'shish"],
            ]).resize(),
          });
        }
      }
    } catch (error) {
      console.log('onAddGroupId: ', error);
    }
  }
}

//"-4659521724"
//"-4628141403"
