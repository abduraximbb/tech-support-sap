import {
  Action,
  Command,
  Ctx,
  Hears,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { BotService } from './bot.service';
import { Context } from 'telegraf';
import { AppealsService } from 'src/appeal/appeal.service';
import { InjectModel } from '@nestjs/sequelize';
import { Bot } from './models/bot.model';
import { ADMINS } from 'src/app.constants';
import { AdminServise } from 'src/admin/admin.service';
import { AdminSteps } from 'src/admin/models/admin-steps.model';
import { ANSWER_BAL } from 'src/language_data';

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    private readonly appealService: AppealsService,
    private readonly adminService: AdminServise,
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectModel(AdminSteps)
    private readonly adminStepsModel: typeof AdminSteps,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await this.botService.onStart(ctx);
  }

  @Command('stop')
  async onStop(@Ctx() ctx: Context) {
    await this.botService.onStop(ctx);
  }

  @Hears(["🇺🇿O'zbekcha", '🇷🇺Русский'])
  async onLanguage(@Ctx() ctx: Context) {
    await this.botService.onLanguage(ctx);
  }

  @On('contact')
  async onContact(@Ctx() ctx: Context) {
    await this.botService.onContact(ctx);
  }

  @On('document')
  async onDocument(@Ctx() ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      await this.adminService.onAdminReply(ctx);
      return;
    }
    const user = await this.botModel.findOne({
      where: { user_id: ctx.from.id },
    });
    if (user && user.last_step === 'media_appeal') {
      await this.appealService.onAppealFile(ctx);
      return;
    }
    await this.appealService.onAddAppeal(ctx);
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    if ('photo' in ctx.message) {
      console.log(ctx.message.photo[2].file_id);
    }
    if (ADMINS.includes(ctx.from.id)) {
      await this.adminService.onAdminReply(ctx);
      return;
    }

    const user = await this.botModel.findOne({
      where: { user_id: ctx.from.id },
    });
    if (user && user.last_step === 'media_appeal') {
      await this.appealService.onAppealPhoto(ctx);
      return;
    }
    await this.appealService.onAddAppeal(ctx);
  }

  @On('voice')
  async onVoice(@Ctx() ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      await this.adminService.onAdminReply(ctx);
      return;
    }

    const user = await this.botModel.findOne({
      where: { user_id: ctx.from.id },
    });
    if (user && user.last_step === 'media_appeal') {
      await this.appealService.onAppealVoice(ctx);
      return;
    }
    await this.appealService.onAddAppeal(ctx);
  }

  @On('video')
  async onVideo(@Ctx() ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      await this.adminService.onAdminReply(ctx);
      return;
    }

    const user = await this.botModel.findOne({
      where: { user_id: ctx.from.id },
    });
    if (user && user.last_step === 'media_appeal') {
      await this.appealService.onAppealVideo(ctx);
      return;
    }
    await this.appealService.onAddAppeal(ctx);
  }

  @Hears(["Jo'natish", 'Отправить'])
  async onSend(@Ctx() ctx: Context) {
    await this.appealService.onSend(ctx);
  }

  @Hears(['📝 Murojaat qilish', '📝 Подать обращение'])
  async onAppeal(@Ctx() ctx: Context) {
    await this.appealService.onAppeal(ctx);
  }

  @Hears([
    "➕ Eski murojaatlarga qo'shimcha qilish",
    '➕ Добавить к предыдущему обращению',
  ])
  async onEditAppeal(@Ctx() ctx: Context) {
    await this.appealService.onEditAppeal(ctx);
  }

  @Action(/^importance_(.+)/) // "importance_" bilan boshlangan barcha tugmalarni ushlaydi
  async onImportanceSelection(@Ctx() ctx: Context) {
    await this.appealService.onAppealImportance(ctx);
  }

  @Action(/^appeal_(\d+)$/)
  async onChooseAppeal(@Ctx() ctx: Context) {
    await this.appealService.onChooseAppeal(ctx);
  }

  @Action(/^not_answered_appeal_(\d+)$/)
  async onChooseNotAnsweredAppeal(@Ctx() ctx: Context) {
    await this.adminService.onChooseNotAnsweredAppeal(ctx);
  }

  @Hears(['🏠 Menyuga qaytish', '🏠 Вернуться в меню'])
  async onBackToMenu(@Ctx() ctx: Context) {
    await this.appealService.onBackToMenu(ctx);
  }

  @Hears(["📂 Barcha murojaatlarni ko'rish", '📂 Посмотреть все обращения'])
  async onViewAllAppeals(@Ctx() ctx: Context) {
    await this.appealService.onViewAllAppeals(ctx);
  }

  @Hears(["📞 Qo'ng'iroq qilishsin", '📞 Пусть позвонят'])
  async onLetThemCall(@Ctx() ctx: Context) {
    await this.appealService.onLetThemCall(ctx);
  }

  @Hears(["🌍 Tilni o'zgartirish", '🌍 Изменить язык'])
  async onSetLanguage(@Ctx() ctx: Context) {
    await this.appealService.onSetLanguage(ctx);
  }

  @Action(/^page_(\d+)/)
  async onPageChange(@Ctx() ctx: Context) {
    try {
      const match = ctx.callbackQuery['data'].split('_')[1]; // Sahifa raqamini olish
      const newPage = parseInt(match, 10);

      // Yangi sahifani yuklash uchun botService dagi funksiyani chaqiramiz
      await this.appealService.loadAppealsPage(ctx, newPage);
    } catch (error) {
      console.error('onPageChange error:', error);
    }
  }

  @Action(/^not_answered_page_\d+$/)
  async onNotAnsweredPageChange(@Ctx() ctx: Context) {
    try {
      const match = ctx.callbackQuery['data'].split('_')[3]; // Sahifa raqamini olish
      const newPage = parseInt(match, 10);

      await this.adminService.loadAppealsPage(ctx, newPage);
    } catch (error) {
      console.error('onPageChange error:', error);
    }
  }

  @Command('admin')
  async onCommandAdmin(@Ctx() ctx: Context) {
    await this.adminService.onCommandAdmin(ctx);
  }

  @Hears('Hisobot')
  async onReportAdmin(@Ctx() ctx: Context) {
    await this.adminService.onReportAdmin(ctx);
  }

  @Hears("Qo'ng'iroqlar")
  async onCaslls(@Ctx() ctx: Context) {
    await this.adminService.onCalls(ctx);
  }

  @Hears('Javob berilmagan murojaatlar')
  async onNotAnsweredAppeals(@Ctx() ctx: Context) {
    await this.adminService.onNotAnsweredAppeals(ctx);
  }

  @Hears('Murojaatni yakunlash')
  async onCompleteAppeal(@Ctx() ctx: Context) {
    await this.adminService.onCompleteAppeal(ctx);
  }

  @Hears(['✅ Murojaatni yopish', '✅ Закрыть обращение'])
  async onCompleteAppelaByCustomer(@Ctx() ctx: Context) {
    await this.appealService.onCompleteAppealByCustomer(ctx);
  }

  @Hears(["➕ Qo'shimcha qilish", '➕ Добавить вопрос'])
  async onAddToAppealByCustomer(@Ctx() ctx: Context) {
    await this.appealService.onAddToAppealByCustomer(ctx);
  }

  @Hears(['🔄 Qayta javob olish', '🔄 Получить ответ заново'])
  async onReplyBack(@Ctx() ctx: Context) {
    await this.appealService.onReplyBack(ctx);
  }

  @Hears(["➕ Qo'shimcha savol berish", '➕ Задать дополнительный вопрос'])
  async onAddAdditionQuestion(@Ctx() ctx: Context) {
    await this.appealService.onAddAdditionQuestion(ctx);
  }

  @Hears("Yangi mijoz qo'shish")
  async onAddNewCustomer(@Ctx() ctx: Context) {
    await this.adminService.onAddNewCustomer(ctx);
  }

  @Hears('Menyuga qaytish')
  async onBackToAdminMenu(@Ctx() ctx: Context) {
    await this.adminService.onBackToAdminMenu(ctx);
  }

  @Hears(['Назад','Ortga'])
  async onBactToChooseComplete(@Ctx() ctx:Context){
    await this.appealService.onBactToChooseComplete(ctx)
  }

  @Hears([
    '1 - Juda yomon',
    '2 - Yomon',
    '3 - Qoniqarli',
    '4 - Yaxshi',
    '5 - A’lo',
    '1 - Очень плохо',
    '2 - Плохо',
    '3 - Удовлетворительно',
    '4 - Хорошо',
    '5 - Отлично',
  ])
  async onBalToAnswer(@Ctx() ctx: Context) {
    await this.appealService.onBalToAnswer(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    if (ADMINS.includes(ctx.from.id)) {
      const exist_admin_step = await this.adminStepsModel.findOne({
        where: { admin_id: ctx.from.id },
      });
      if (exist_admin_step && exist_admin_step.last_step === 'add_new_cus') {
        await this.adminService.onAddCompanyName(ctx);
        return;
      } else if (
        exist_admin_step &&
        exist_admin_step.last_step === 'company_name'
      ) {
        await this.adminService.onAddCompanyShortName(ctx);
        return;
      } else if (
        exist_admin_step &&
        exist_admin_step.last_step === 'brand_name'
      ) {
        await this.adminService.onAddSapId(ctx);
        return;
      } else if (
        exist_admin_step &&
        exist_admin_step.last_step === 'group_id'
      ) {
        await this.adminService.onAddGroupId(ctx);
        return;
      }
      await this.adminService.onAdminReply(ctx);
      return;
    }
    const user = await this.botModel.findByPk(ctx.from.id);
    if (user && user?.last_step.split('_')[1] === 'appeal') {
      await this.appealService.onAppealText(ctx);
      return;
    } else if (
      user &&
      user?.last_step !== 'edit' &&
      user?.last_step.split('_')[0] === 'edit'
    ) {
      await this.appealService.onAddAppeal(ctx);
      return;
    } else if (user && user.last_step === 'phone') {
      await this.botService.onAddPhoneNumber(ctx);
      return;
    }
    await this.botService.onText(ctx);
  }
}
