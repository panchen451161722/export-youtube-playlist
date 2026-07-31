import { m } from '@/paraglide/messages.js';

// Keep runtime-built keys on a static allowlist. Every value is a direct
// Paraglide reference, so the bundler includes only these messages instead of
// treating the complete message namespace as reachable.
const dynamicMessages = {
  'settings.billing.tab_all': m['settings.billing.tab_all'],
  'settings.billing.tab_active': m['settings.billing.tab_active'],
  'settings.billing.tab_trialing': m['settings.billing.tab_trialing'],
  'settings.billing.tab_paused': m['settings.billing.tab_paused'],
  'settings.billing.tab_expired': m['settings.billing.tab_expired'],
  'settings.billing.tab_pending_cancel':
    m['settings.billing.tab_pending_cancel'],
  'settings.billing.tab_canceled': m['settings.billing.tab_canceled'],
  'settings.payments.tab_all': m['settings.payments.tab_all'],
  'settings.payments.tab_one_time': m['settings.payments.tab_one_time'],
  'settings.payments.tab_subscription': m['settings.payments.tab_subscription'],
  'settings.payments.tab_renew': m['settings.payments.tab_renew'],
  'settings.credits.tab_all': m['settings.credits.tab_all'],
  'settings.credits.tab_grant': m['settings.credits.tab_grant'],
  'settings.credits.tab_consume': m['settings.credits.tab_consume'],
  'settings.tickets.status_col': m['settings.tickets.status_col'],
  'settings.tickets.status_open': m['settings.tickets.status_open'],
  'settings.tickets.status_replied': m['settings.tickets.status_replied'],
  'settings.tickets.status_closed': m['settings.tickets.status_closed'],
  'admin.posts.tab_all': m['admin.posts.tab_all'],
  'admin.posts.tab_published': m['admin.posts.tab_published'],
  'admin.posts.tab_draft': m['admin.posts.tab_draft'],
  'admin.payments.tab_all': m['admin.payments.tab_all'],
  'admin.payments.tab_subscription': m['admin.payments.tab_subscription'],
  'admin.payments.tab_one_time': m['admin.payments.tab_one_time'],
  'admin.subscriptions.tab_all': m['admin.subscriptions.tab_all'],
  'admin.subscriptions.tab_month': m['admin.subscriptions.tab_month'],
  'admin.subscriptions.tab_year': m['admin.subscriptions.tab_year'],
  'admin.credits.tab_all': m['admin.credits.tab_all'],
  'admin.credits.tab_grant': m['admin.credits.tab_grant'],
  'admin.credits.tab_consume': m['admin.credits.tab_consume'],
  'admin.invite_codes.tab_all': m['admin.invite_codes.tab_all'],
  'admin.invite_codes.tab_available': m['admin.invite_codes.tab_available'],
  'admin.invite_codes.tab_used': m['admin.invite_codes.tab_used'],
  'admin.settings.tabs.general': m['admin.settings.tabs.general'],
  'admin.settings.tabs.auth': m['admin.settings.tabs.auth'],
  'admin.settings.tabs.payment': m['admin.settings.tabs.payment'],
  'admin.settings.tabs.email': m['admin.settings.tabs.email'],
  'admin.settings.tabs.storage': m['admin.settings.tabs.storage'],
  'admin.settings.tabs.ai': m['admin.settings.tabs.ai'],
  'admin.settings.tabs.analytics': m['admin.settings.tabs.analytics'],
  'admin.settings.tabs.customer_service':
    m['admin.settings.tabs.customer_service'],
  'admin.settings.tabs.custom': m['admin.settings.tabs.custom'],
  'admin.settings.groups.appinfo.title':
    m['admin.settings.groups.appinfo.title'],
  'admin.settings.groups.user_role.title':
    m['admin.settings.groups.user_role.title'],
  'admin.settings.groups.credit.title': m['admin.settings.groups.credit.title'],
  'admin.settings.groups.email_auth.title':
    m['admin.settings.groups.email_auth.title'],
  'admin.settings.groups.google_auth.title':
    m['admin.settings.groups.google_auth.title'],
  'admin.settings.groups.github_auth.title':
    m['admin.settings.groups.github_auth.title'],
  'admin.settings.groups.basic_payment.title':
    m['admin.settings.groups.basic_payment.title'],
  'admin.settings.groups.stripe.title': m['admin.settings.groups.stripe.title'],
  'admin.settings.groups.creem.title': m['admin.settings.groups.creem.title'],
  'admin.settings.groups.paypal.title': m['admin.settings.groups.paypal.title'],
  'admin.settings.groups.alipay.title': m['admin.settings.groups.alipay.title'],
  'admin.settings.groups.wechat.title': m['admin.settings.groups.wechat.title'],
  'admin.settings.groups.email_general.title':
    m['admin.settings.groups.email_general.title'],
  'admin.settings.groups.resend.title': m['admin.settings.groups.resend.title'],
  'admin.settings.groups.cloudflare_email.title':
    m['admin.settings.groups.cloudflare_email.title'],
  'admin.settings.groups.r2.title': m['admin.settings.groups.r2.title'],
  'admin.settings.groups.openai.title': m['admin.settings.groups.openai.title'],
  'admin.settings.groups.anthropic.title':
    m['admin.settings.groups.anthropic.title'],
  'admin.settings.groups.replicate.title':
    m['admin.settings.groups.replicate.title'],
  'admin.settings.groups.fal.title': m['admin.settings.groups.fal.title'],
  'admin.settings.groups.google_analytics.title':
    m['admin.settings.groups.google_analytics.title'],
  'admin.settings.groups.plausible.title':
    m['admin.settings.groups.plausible.title'],
  'admin.settings.groups.clarity.title':
    m['admin.settings.groups.clarity.title'],
  'admin.settings.groups.crisp.title': m['admin.settings.groups.crisp.title'],
  'admin.settings.groups.tawk.title': m['admin.settings.groups.tawk.title'],
  'admin.settings.fields.app_name': m['admin.settings.fields.app_name'],
  'admin.settings.fields.app_description':
    m['admin.settings.fields.app_description'],
  'admin.settings.fields.app_url': m['admin.settings.fields.app_url'],
  'admin.settings.fields.initial_role_enabled':
    m['admin.settings.fields.initial_role_enabled'],
  'admin.settings.fields.initial_role_name':
    m['admin.settings.fields.initial_role_name'],
  'admin.settings.fields.initial_credits_enabled':
    m['admin.settings.fields.initial_credits_enabled'],
  'admin.settings.fields.initial_credits_amount':
    m['admin.settings.fields.initial_credits_amount'],
  'admin.settings.fields.initial_credits_valid_days':
    m['admin.settings.fields.initial_credits_valid_days'],
  'admin.settings.fields.initial_credits_description':
    m['admin.settings.fields.initial_credits_description'],
  'admin.settings.fields.email_auth_enabled':
    m['admin.settings.fields.email_auth_enabled'],
  'admin.settings.fields.email_verification_enabled':
    m['admin.settings.fields.email_verification_enabled'],
  'admin.settings.fields.google_auth_enabled':
    m['admin.settings.fields.google_auth_enabled'],
  'admin.settings.fields.google_one_tap_enabled':
    m['admin.settings.fields.google_one_tap_enabled'],
  'admin.settings.fields.google_client_id':
    m['admin.settings.fields.google_client_id'],
  'admin.settings.fields.google_client_secret':
    m['admin.settings.fields.google_client_secret'],
  'admin.settings.fields.github_auth_enabled':
    m['admin.settings.fields.github_auth_enabled'],
  'admin.settings.fields.github_client_id':
    m['admin.settings.fields.github_client_id'],
  'admin.settings.fields.github_client_secret':
    m['admin.settings.fields.github_client_secret'],
  'admin.settings.fields.invite_code_required':
    m['admin.settings.fields.invite_code_required'],
  'admin.settings.fields.select_payment_enabled':
    m['admin.settings.fields.select_payment_enabled'],
  'admin.settings.fields.default_payment_provider':
    m['admin.settings.fields.default_payment_provider'],
  'admin.settings.fields.stripe_enabled':
    m['admin.settings.fields.stripe_enabled'],
  'admin.settings.fields.stripe_secret_key':
    m['admin.settings.fields.stripe_secret_key'],
  'admin.settings.fields.stripe_publishable_key':
    m['admin.settings.fields.stripe_publishable_key'],
  'admin.settings.fields.stripe_signing_secret':
    m['admin.settings.fields.stripe_signing_secret'],
  'admin.settings.fields.creem_enabled':
    m['admin.settings.fields.creem_enabled'],
  'admin.settings.fields.creem_environment':
    m['admin.settings.fields.creem_environment'],
  'admin.settings.fields.creem_api_key':
    m['admin.settings.fields.creem_api_key'],
  'admin.settings.fields.creem_signing_secret':
    m['admin.settings.fields.creem_signing_secret'],
  'admin.settings.fields.creem_product_ids_mapping':
    m['admin.settings.fields.creem_product_ids_mapping'],
  'admin.settings.fields.creem_test_amount':
    m['admin.settings.fields.creem_test_amount'],
  'admin.settings.fields.paypal_enabled':
    m['admin.settings.fields.paypal_enabled'],
  'admin.settings.fields.paypal_client_id':
    m['admin.settings.fields.paypal_client_id'],
  'admin.settings.fields.paypal_client_secret':
    m['admin.settings.fields.paypal_client_secret'],
  'admin.settings.fields.paypal_webhook_id':
    m['admin.settings.fields.paypal_webhook_id'],
  'admin.settings.fields.paypal_environment':
    m['admin.settings.fields.paypal_environment'],
  'admin.settings.fields.paypal_test_amount':
    m['admin.settings.fields.paypal_test_amount'],
  'admin.settings.fields.alipay_enabled':
    m['admin.settings.fields.alipay_enabled'],
  'admin.settings.fields.alipay_app_id':
    m['admin.settings.fields.alipay_app_id'],
  'admin.settings.fields.alipay_private_key':
    m['admin.settings.fields.alipay_private_key'],
  'admin.settings.fields.alipay_public_key':
    m['admin.settings.fields.alipay_public_key'],
  'admin.settings.fields.alipay_notify_url':
    m['admin.settings.fields.alipay_notify_url'],
  'admin.settings.fields.alipay_test_amount':
    m['admin.settings.fields.alipay_test_amount'],
  'admin.settings.fields.wechat_enabled':
    m['admin.settings.fields.wechat_enabled'],
  'admin.settings.fields.wechat_app_id':
    m['admin.settings.fields.wechat_app_id'],
  'admin.settings.fields.wechat_mch_id':
    m['admin.settings.fields.wechat_mch_id'],
  'admin.settings.fields.wechat_api_v3_key':
    m['admin.settings.fields.wechat_api_v3_key'],
  'admin.settings.fields.wechat_private_key':
    m['admin.settings.fields.wechat_private_key'],
  'admin.settings.fields.wechat_serial_no':
    m['admin.settings.fields.wechat_serial_no'],
  'admin.settings.fields.wechat_notify_url':
    m['admin.settings.fields.wechat_notify_url'],
  'admin.settings.fields.wechat_test_amount':
    m['admin.settings.fields.wechat_test_amount'],
  'admin.settings.fields.email_provider':
    m['admin.settings.fields.email_provider'],
  'admin.settings.fields.resend_api_key':
    m['admin.settings.fields.resend_api_key'],
  'admin.settings.fields.resend_sender_email':
    m['admin.settings.fields.resend_sender_email'],
  'admin.settings.fields.cloudflare_email_api_token':
    m['admin.settings.fields.cloudflare_email_api_token'],
  'admin.settings.fields.cloudflare_email_account_id':
    m['admin.settings.fields.cloudflare_email_account_id'],
  'admin.settings.fields.cloudflare_email_sender_email':
    m['admin.settings.fields.cloudflare_email_sender_email'],
  'admin.settings.fields.r2_access_key':
    m['admin.settings.fields.r2_access_key'],
  'admin.settings.fields.r2_secret_key':
    m['admin.settings.fields.r2_secret_key'],
  'admin.settings.fields.r2_bucket_name':
    m['admin.settings.fields.r2_bucket_name'],
  'admin.settings.fields.r2_upload_path':
    m['admin.settings.fields.r2_upload_path'],
  'admin.settings.fields.r2_endpoint': m['admin.settings.fields.r2_endpoint'],
  'admin.settings.fields.r2_domain': m['admin.settings.fields.r2_domain'],
  'admin.settings.fields.openai_base_url':
    m['admin.settings.fields.openai_base_url'],
  'admin.settings.fields.openai_api_key':
    m['admin.settings.fields.openai_api_key'],
  'admin.settings.fields.anthropic_base_url':
    m['admin.settings.fields.anthropic_base_url'],
  'admin.settings.fields.anthropic_api_key':
    m['admin.settings.fields.anthropic_api_key'],
  'admin.settings.fields.replicate_api_token':
    m['admin.settings.fields.replicate_api_token'],
  'admin.settings.fields.fal_api_key': m['admin.settings.fields.fal_api_key'],
  'admin.settings.fields.google_analytics_id':
    m['admin.settings.fields.google_analytics_id'],
  'admin.settings.fields.plausible_domain':
    m['admin.settings.fields.plausible_domain'],
  'admin.settings.fields.plausible_src':
    m['admin.settings.fields.plausible_src'],
  'admin.settings.fields.clarity_project_id':
    m['admin.settings.fields.clarity_project_id'],
  'admin.settings.fields.crisp_enabled':
    m['admin.settings.fields.crisp_enabled'],
  'admin.settings.fields.crisp_website_id':
    m['admin.settings.fields.crisp_website_id'],
  'admin.settings.fields.tawk_enabled': m['admin.settings.fields.tawk_enabled'],
  'admin.settings.fields.tawk_property_id':
    m['admin.settings.fields.tawk_property_id'],
  'admin.settings.fields.tawk_widget_id':
    m['admin.settings.fields.tawk_widget_id'],
  'admin.tickets.status_col': m['admin.tickets.status_col'],
  'admin.tickets.tab_all': m['admin.tickets.tab_all'],
  'admin.tickets.tab_open': m['admin.tickets.tab_open'],
  'admin.tickets.tab_replied': m['admin.tickets.tab_replied'],
  'admin.tickets.tab_closed': m['admin.tickets.tab_closed'],
  'admin.tickets.status_open': m['admin.tickets.status_open'],
  'admin.tickets.status_replied': m['admin.tickets.status_replied'],
  'admin.tickets.status_closed': m['admin.tickets.status_closed'],
  'admin.tickets.status_updated': m['admin.tickets.status_updated'],
  'tools.extra.ui.video_input': m['tools.extra.ui.video_input'],
  'tools.extra.ui.video_placeholder': m['tools.extra.ui.video_placeholder'],
  'tools.extra.ui.video_helper': m['tools.extra.ui.video_helper'],
  'tools.extra.ui.channel_input': m['tools.extra.ui.channel_input'],
  'tools.extra.ui.channel_placeholder': m['tools.extra.ui.channel_placeholder'],
  'tools.extra.ui.channel_helper': m['tools.extra.ui.channel_helper'],
  'tools.extra.ui.loading': m['tools.extra.ui.loading'],
  'tools.extra.ui.video_error': m['tools.extra.ui.video_error'],
  'tools.extra.ui.channel_error': m['tools.extra.ui.channel_error'],
  'tools.extra.ui.results': m['tools.extra.ui.results'],
  'tools.extra.ui.copy': m['tools.extra.ui.copy'],
  'tools.extra.ui.copied': m['tools.extra.ui.copied'],
  'tools.extra.ui.download': m['tools.extra.ui.download'],
  'tools.extra.ui.download_txt': m['tools.extra.ui.download_txt'],
  'tools.extra.ui.download_all': m['tools.extra.ui.download_all'],
  'tools.extra.ui.open': m['tools.extra.ui.open'],
  'tools.extra.ui.title': m['tools.extra.ui.title'],
  'tools.extra.ui.channel': m['tools.extra.ui.channel'],
  'tools.extra.ui.actual_tags': m['tools.extra.ui.actual_tags'],
  'tools.extra.ui.description_tags': m['tools.extra.ui.description_tags'],
  'tools.extra.ui.include_description_tags':
    m['tools.extra.ui.include_description_tags'],
  'tools.extra.ui.sort': m['tools.extra.ui.sort'],
  'tools.extra.ui.sort_original': m['tools.extra.ui.sort_original'],
  'tools.extra.ui.sort_az': m['tools.extra.ui.sort_az'],
  'tools.extra.ui.sort_za': m['tools.extra.ui.sort_za'],
  'tools.extra.ui.sort_longest': m['tools.extra.ui.sort_longest'],
  'tools.extra.ui.sort_shortest': m['tools.extra.ui.sort_shortest'],
  'tools.extra.ui.copy_hashtags': m['tools.extra.ui.copy_hashtags'],
  'tools.extra.ui.description': m['tools.extra.ui.description'],
  'tools.extra.ui.emails': m['tools.extra.ui.emails'],
  'tools.extra.ui.links': m['tools.extra.ui.links'],
  'tools.extra.ui.statistics': m['tools.extra.ui.statistics'],
  'tools.extra.ui.views': m['tools.extra.ui.views'],
  'tools.extra.ui.likes': m['tools.extra.ui.likes'],
  'tools.extra.ui.comments': m['tools.extra.ui.comments'],
  'tools.extra.ui.no_data': m['tools.extra.ui.no_data'],
  'tools.extra.ui.embed_options': m['tools.extra.ui.embed_options'],
  'tools.extra.ui.autoplay': m['tools.extra.ui.autoplay'],
  'tools.extra.ui.controls': m['tools.extra.ui.controls'],
  'tools.extra.ui.loop': m['tools.extra.ui.loop'],
  'tools.extra.ui.muted': m['tools.extra.ui.muted'],
  'tools.extra.ui.related': m['tools.extra.ui.related'],
  'tools.extra.ui.responsive': m['tools.extra.ui.responsive'],
  'tools.extra.ui.shorts_ratio': m['tools.extra.ui.shorts_ratio'],
  'tools.extra.ui.start_seconds': m['tools.extra.ui.start_seconds'],
  'tools.extra.ui.end_seconds': m['tools.extra.ui.end_seconds'],
  'tools.extra.ui.embed_code': m['tools.extra.ui.embed_code'],
  'tools.extra.ui.preview': m['tools.extra.ui.preview'],
  'tools.extra.ui.restriction_status': m['tools.extra.ui.restriction_status'],
  'tools.extra.ui.unrestricted': m['tools.extra.ui.unrestricted'],
  'tools.extra.ui.allowed_only': m['tools.extra.ui.allowed_only'],
  'tools.extra.ui.blocked_in': m['tools.extra.ui.blocked_in'],
  'tools.extra.ui.region_codes': m['tools.extra.ui.region_codes'],
  'tools.extra.ui.download_csv': m['tools.extra.ui.download_csv'],
  'tools.extra.ui.download_xlsx': m['tools.extra.ui.download_xlsx'],
  'tools.extra.ui.channel_id': m['tools.extra.ui.channel_id'],
  'tools.extra.ui.channel_name': m['tools.extra.ui.channel_name'],
  'tools.extra.ui.handle': m['tools.extra.ui.handle'],
  'tools.extra.ui.country': m['tools.extra.ui.country'],
  'tools.extra.ui.playlist_url': m['tools.extra.ui.playlist_url'],
  'tools.extra.ui.playlist_id': m['tools.extra.ui.playlist_id'],
  'tools.extra.ui.subscribe_url': m['tools.extra.ui.subscribe_url'],
  'tools.extra.ui.media_type': m['tools.extra.ui.media_type'],
  'tools.extra.ui.all_uploads': m['tools.extra.ui.all_uploads'],
  'tools.extra.ui.videos_only': m['tools.extra.ui.videos_only'],
  'tools.extra.ui.shorts_only': m['tools.extra.ui.shorts_only'],
  'tools.extra.ui.live_only': m['tools.extra.ui.live_only'],
  'tools.extra.ui.sort_newest': m['tools.extra.ui.sort_newest'],
  'tools.extra.ui.sort_oldest': m['tools.extra.ui.sort_oldest'],
  'tools.extra.ui.sort_views': m['tools.extra.ui.sort_views'],
  'tools.extra.ui.sort_likes': m['tools.extra.ui.sort_likes'],
  'tools.extra.ui.sort_comments': m['tools.extra.ui.sort_comments'],
  'tools.extra.ui.search': m['tools.extra.ui.search'],
  'tools.extra.ui.count': m['tools.extra.ui.count'],
  'tools.extra.ui.total_uploads': m['tools.extra.ui.total_uploads'],
  'tools.extra.ui.total_duration': m['tools.extra.ui.total_duration'],
  'tools.extra.ui.average_duration': m['tools.extra.ui.average_duration'],
  'tools.extra.ui.total_views': m['tools.extra.ui.total_views'],
  'tools.extra.ui.average_views': m['tools.extra.ui.average_views'],
  'tools.extra.ui.total_likes': m['tools.extra.ui.total_likes'],
  'tools.extra.ui.total_comments': m['tools.extra.ui.total_comments'],
  'tools.extra.ui.engagement_rate': m['tools.extra.ui.engagement_rate'],
  'tools.extra.ui.formats': m['tools.extra.ui.formats'],
  'tools.extra.ui.choose_formats': m['tools.extra.ui.choose_formats'],
  'tools.extra.ui.default_formats': m['tools.extra.ui.default_formats'],
  'tools.extra.ui.download_success': m['tools.extra.ui.download_success'],
  'tools.extra.ui.download_selected': m['tools.extra.ui.download_selected'],
  'tools.extra.ui.top_videos': m['tools.extra.ui.top_videos'],
  'tools.extra.ui.keywords': m['tools.extra.ui.keywords'],
  'tools.extra.ui.logos': m['tools.extra.ui.logos'],
  'tools.extra.ui.banners': m['tools.extra.ui.banners'],
  'tools.extra.ui.video_count': m['tools.extra.ui.video_count'],
  'tools.extra.ui.how_title': m['tools.extra.ui.how_title'],
  'tools.extra.ui.step_1_title': m['tools.extra.ui.step_1_title'],
  'tools.extra.ui.video_step_1': m['tools.extra.ui.video_step_1'],
  'tools.extra.ui.channel_step_1': m['tools.extra.ui.channel_step_1'],
  'tools.extra.ui.step_2_title': m['tools.extra.ui.step_2_title'],
  'tools.extra.ui.step_3_title': m['tools.extra.ui.step_3_title'],
  'tools.extra.ui.benefits_title': m['tools.extra.ui.benefits_title'],
  'tools.extra.ui.benefit_official_title':
    m['tools.extra.ui.benefit_official_title'],
  'tools.extra.ui.benefit_official_description':
    m['tools.extra.ui.benefit_official_description'],
  'tools.extra.ui.benefit_private_title':
    m['tools.extra.ui.benefit_private_title'],
  'tools.extra.ui.benefit_private_description':
    m['tools.extra.ui.benefit_private_description'],
  'tools.extra.ui.benefit_export_title':
    m['tools.extra.ui.benefit_export_title'],
  'tools.extra.ui.faq_title': m['tools.extra.ui.faq_title'],
  'tools.extra.ui.faq_login_question': m['tools.extra.ui.faq_login_question'],
  'tools.extra.ui.faq_login_answer': m['tools.extra.ui.faq_login_answer'],
  'tools.extra.ui.faq_data_question': m['tools.extra.ui.faq_data_question'],
  'tools.extra.ui.faq_data_answer': m['tools.extra.ui.faq_data_answer'],
  'tools.extra.thumbnail.title': m['tools.extra.thumbnail.title'],
  'tools.extra.thumbnail.description': m['tools.extra.thumbnail.description'],
  'tools.extra.thumbnail.seo_title': m['tools.extra.thumbnail.seo_title'],
  'tools.extra.thumbnail.seo_description':
    m['tools.extra.thumbnail.seo_description'],
  'tools.extra.thumbnail.eyebrow': m['tools.extra.thumbnail.eyebrow'],
  'tools.extra.thumbnail.submit': m['tools.extra.thumbnail.submit'],
  'tools.extra.thumbnail.step_2': m['tools.extra.thumbnail.step_2'],
  'tools.extra.thumbnail.step_3': m['tools.extra.thumbnail.step_3'],
  'tools.extra.thumbnail.benefit_export':
    m['tools.extra.thumbnail.benefit_export'],
  'tools.extra.thumbnail.faq_1_question':
    m['tools.extra.thumbnail.faq_1_question'],
  'tools.extra.thumbnail.faq_1_answer': m['tools.extra.thumbnail.faq_1_answer'],
  'tools.extra.tags.title': m['tools.extra.tags.title'],
  'tools.extra.tags.description': m['tools.extra.tags.description'],
  'tools.extra.tags.seo_title': m['tools.extra.tags.seo_title'],
  'tools.extra.tags.seo_description': m['tools.extra.tags.seo_description'],
  'tools.extra.tags.eyebrow': m['tools.extra.tags.eyebrow'],
  'tools.extra.tags.submit': m['tools.extra.tags.submit'],
  'tools.extra.tags.step_2': m['tools.extra.tags.step_2'],
  'tools.extra.tags.step_3': m['tools.extra.tags.step_3'],
  'tools.extra.tags.benefit_export': m['tools.extra.tags.benefit_export'],
  'tools.extra.tags.faq_1_question': m['tools.extra.tags.faq_1_question'],
  'tools.extra.tags.faq_1_answer': m['tools.extra.tags.faq_1_answer'],
  'tools.extra.description.title': m['tools.extra.description.title'],
  'tools.extra.description.description':
    m['tools.extra.description.description'],
  'tools.extra.description.seo_title': m['tools.extra.description.seo_title'],
  'tools.extra.description.seo_description':
    m['tools.extra.description.seo_description'],
  'tools.extra.description.eyebrow': m['tools.extra.description.eyebrow'],
  'tools.extra.description.submit': m['tools.extra.description.submit'],
  'tools.extra.description.step_2': m['tools.extra.description.step_2'],
  'tools.extra.description.step_3': m['tools.extra.description.step_3'],
  'tools.extra.description.benefit_export':
    m['tools.extra.description.benefit_export'],
  'tools.extra.description.faq_1_question':
    m['tools.extra.description.faq_1_question'],
  'tools.extra.description.faq_1_answer':
    m['tools.extra.description.faq_1_answer'],
  'tools.extra.embed.title': m['tools.extra.embed.title'],
  'tools.extra.embed.description': m['tools.extra.embed.description'],
  'tools.extra.embed.seo_title': m['tools.extra.embed.seo_title'],
  'tools.extra.embed.seo_description': m['tools.extra.embed.seo_description'],
  'tools.extra.embed.eyebrow': m['tools.extra.embed.eyebrow'],
  'tools.extra.embed.submit': m['tools.extra.embed.submit'],
  'tools.extra.embed.step_2': m['tools.extra.embed.step_2'],
  'tools.extra.embed.step_3': m['tools.extra.embed.step_3'],
  'tools.extra.embed.benefit_export': m['tools.extra.embed.benefit_export'],
  'tools.extra.embed.faq_1_question': m['tools.extra.embed.faq_1_question'],
  'tools.extra.embed.faq_1_answer': m['tools.extra.embed.faq_1_answer'],
  'tools.extra.restrictions.title': m['tools.extra.restrictions.title'],
  'tools.extra.restrictions.description':
    m['tools.extra.restrictions.description'],
  'tools.extra.restrictions.seo_title': m['tools.extra.restrictions.seo_title'],
  'tools.extra.restrictions.seo_description':
    m['tools.extra.restrictions.seo_description'],
  'tools.extra.restrictions.eyebrow': m['tools.extra.restrictions.eyebrow'],
  'tools.extra.restrictions.submit': m['tools.extra.restrictions.submit'],
  'tools.extra.restrictions.step_2': m['tools.extra.restrictions.step_2'],
  'tools.extra.restrictions.step_3': m['tools.extra.restrictions.step_3'],
  'tools.extra.restrictions.benefit_export':
    m['tools.extra.restrictions.benefit_export'],
  'tools.extra.restrictions.faq_1_question':
    m['tools.extra.restrictions.faq_1_question'],
  'tools.extra.restrictions.faq_1_answer':
    m['tools.extra.restrictions.faq_1_answer'],
  'tools.extra.channel_id.title': m['tools.extra.channel_id.title'],
  'tools.extra.channel_id.description': m['tools.extra.channel_id.description'],
  'tools.extra.channel_id.seo_title': m['tools.extra.channel_id.seo_title'],
  'tools.extra.channel_id.seo_description':
    m['tools.extra.channel_id.seo_description'],
  'tools.extra.channel_id.eyebrow': m['tools.extra.channel_id.eyebrow'],
  'tools.extra.channel_id.submit': m['tools.extra.channel_id.submit'],
  'tools.extra.channel_id.step_2': m['tools.extra.channel_id.step_2'],
  'tools.extra.channel_id.step_3': m['tools.extra.channel_id.step_3'],
  'tools.extra.channel_id.benefit_export':
    m['tools.extra.channel_id.benefit_export'],
  'tools.extra.channel_id.faq_1_question':
    m['tools.extra.channel_id.faq_1_question'],
  'tools.extra.channel_id.faq_1_answer':
    m['tools.extra.channel_id.faq_1_answer'],
  'tools.extra.channel_playlist.title': m['tools.extra.channel_playlist.title'],
  'tools.extra.channel_playlist.description':
    m['tools.extra.channel_playlist.description'],
  'tools.extra.channel_playlist.seo_title':
    m['tools.extra.channel_playlist.seo_title'],
  'tools.extra.channel_playlist.seo_description':
    m['tools.extra.channel_playlist.seo_description'],
  'tools.extra.channel_playlist.eyebrow':
    m['tools.extra.channel_playlist.eyebrow'],
  'tools.extra.channel_playlist.submit':
    m['tools.extra.channel_playlist.submit'],
  'tools.extra.channel_playlist.step_2':
    m['tools.extra.channel_playlist.step_2'],
  'tools.extra.channel_playlist.step_3':
    m['tools.extra.channel_playlist.step_3'],
  'tools.extra.channel_playlist.benefit_export':
    m['tools.extra.channel_playlist.benefit_export'],
  'tools.extra.channel_playlist.faq_1_question':
    m['tools.extra.channel_playlist.faq_1_question'],
  'tools.extra.channel_playlist.faq_1_answer':
    m['tools.extra.channel_playlist.faq_1_answer'],
  'tools.extra.subscribe.title': m['tools.extra.subscribe.title'],
  'tools.extra.subscribe.description': m['tools.extra.subscribe.description'],
  'tools.extra.subscribe.seo_title': m['tools.extra.subscribe.seo_title'],
  'tools.extra.subscribe.seo_description':
    m['tools.extra.subscribe.seo_description'],
  'tools.extra.subscribe.eyebrow': m['tools.extra.subscribe.eyebrow'],
  'tools.extra.subscribe.submit': m['tools.extra.subscribe.submit'],
  'tools.extra.subscribe.step_2': m['tools.extra.subscribe.step_2'],
  'tools.extra.subscribe.step_3': m['tools.extra.subscribe.step_3'],
  'tools.extra.subscribe.benefit_export':
    m['tools.extra.subscribe.benefit_export'],
  'tools.extra.subscribe.faq_1_question':
    m['tools.extra.subscribe.faq_1_question'],
  'tools.extra.subscribe.faq_1_answer': m['tools.extra.subscribe.faq_1_answer'],
  'tools.extra.channel_playlists.title':
    m['tools.extra.channel_playlists.title'],
  'tools.extra.channel_playlists.description':
    m['tools.extra.channel_playlists.description'],
  'tools.extra.channel_playlists.seo_title':
    m['tools.extra.channel_playlists.seo_title'],
  'tools.extra.channel_playlists.seo_description':
    m['tools.extra.channel_playlists.seo_description'],
  'tools.extra.channel_playlists.eyebrow':
    m['tools.extra.channel_playlists.eyebrow'],
  'tools.extra.channel_playlists.submit':
    m['tools.extra.channel_playlists.submit'],
  'tools.extra.channel_playlists.step_2':
    m['tools.extra.channel_playlists.step_2'],
  'tools.extra.channel_playlists.step_3':
    m['tools.extra.channel_playlists.step_3'],
  'tools.extra.channel_playlists.benefit_export':
    m['tools.extra.channel_playlists.benefit_export'],
  'tools.extra.channel_playlists.faq_1_question':
    m['tools.extra.channel_playlists.faq_1_question'],
  'tools.extra.channel_playlists.faq_1_answer':
    m['tools.extra.channel_playlists.faq_1_answer'],
  'tools.extra.channel_links.title': m['tools.extra.channel_links.title'],
  'tools.extra.channel_links.description':
    m['tools.extra.channel_links.description'],
  'tools.extra.channel_links.seo_title':
    m['tools.extra.channel_links.seo_title'],
  'tools.extra.channel_links.seo_description':
    m['tools.extra.channel_links.seo_description'],
  'tools.extra.channel_links.eyebrow': m['tools.extra.channel_links.eyebrow'],
  'tools.extra.channel_links.submit': m['tools.extra.channel_links.submit'],
  'tools.extra.channel_links.step_2': m['tools.extra.channel_links.step_2'],
  'tools.extra.channel_links.step_3': m['tools.extra.channel_links.step_3'],
  'tools.extra.channel_links.benefit_export':
    m['tools.extra.channel_links.benefit_export'],
  'tools.extra.channel_links.faq_1_question':
    m['tools.extra.channel_links.faq_1_question'],
  'tools.extra.channel_links.faq_1_answer':
    m['tools.extra.channel_links.faq_1_answer'],
  'tools.extra.channel_titles.title': m['tools.extra.channel_titles.title'],
  'tools.extra.channel_titles.description':
    m['tools.extra.channel_titles.description'],
  'tools.extra.channel_titles.seo_title':
    m['tools.extra.channel_titles.seo_title'],
  'tools.extra.channel_titles.seo_description':
    m['tools.extra.channel_titles.seo_description'],
  'tools.extra.channel_titles.eyebrow': m['tools.extra.channel_titles.eyebrow'],
  'tools.extra.channel_titles.submit': m['tools.extra.channel_titles.submit'],
  'tools.extra.channel_titles.step_2': m['tools.extra.channel_titles.step_2'],
  'tools.extra.channel_titles.step_3': m['tools.extra.channel_titles.step_3'],
  'tools.extra.channel_titles.benefit_export':
    m['tools.extra.channel_titles.benefit_export'],
  'tools.extra.channel_titles.faq_1_question':
    m['tools.extra.channel_titles.faq_1_question'],
  'tools.extra.channel_titles.faq_1_answer':
    m['tools.extra.channel_titles.faq_1_answer'],
  'tools.extra.channel_export.title': m['tools.extra.channel_export.title'],
  'tools.extra.channel_export.description':
    m['tools.extra.channel_export.description'],
  'tools.extra.channel_export.seo_title':
    m['tools.extra.channel_export.seo_title'],
  'tools.extra.channel_export.seo_description':
    m['tools.extra.channel_export.seo_description'],
  'tools.extra.channel_export.eyebrow': m['tools.extra.channel_export.eyebrow'],
  'tools.extra.channel_export.submit': m['tools.extra.channel_export.submit'],
  'tools.extra.channel_export.step_2': m['tools.extra.channel_export.step_2'],
  'tools.extra.channel_export.step_3': m['tools.extra.channel_export.step_3'],
  'tools.extra.channel_export.benefit_export':
    m['tools.extra.channel_export.benefit_export'],
  'tools.extra.channel_export.faq_1_question':
    m['tools.extra.channel_export.faq_1_question'],
  'tools.extra.channel_export.faq_1_answer':
    m['tools.extra.channel_export.faq_1_answer'],
  'tools.extra.channel_analyzer.title': m['tools.extra.channel_analyzer.title'],
  'tools.extra.channel_analyzer.description':
    m['tools.extra.channel_analyzer.description'],
  'tools.extra.channel_analyzer.seo_title':
    m['tools.extra.channel_analyzer.seo_title'],
  'tools.extra.channel_analyzer.seo_description':
    m['tools.extra.channel_analyzer.seo_description'],
  'tools.extra.channel_analyzer.eyebrow':
    m['tools.extra.channel_analyzer.eyebrow'],
  'tools.extra.channel_analyzer.submit':
    m['tools.extra.channel_analyzer.submit'],
  'tools.extra.channel_analyzer.step_2':
    m['tools.extra.channel_analyzer.step_2'],
  'tools.extra.channel_analyzer.step_3':
    m['tools.extra.channel_analyzer.step_3'],
  'tools.extra.channel_analyzer.benefit_export':
    m['tools.extra.channel_analyzer.benefit_export'],
  'tools.extra.channel_analyzer.faq_1_question':
    m['tools.extra.channel_analyzer.faq_1_question'],
  'tools.extra.channel_analyzer.faq_1_answer':
    m['tools.extra.channel_analyzer.faq_1_answer'],
  'tools.extra.channel_keywords.title': m['tools.extra.channel_keywords.title'],
  'tools.extra.channel_keywords.description':
    m['tools.extra.channel_keywords.description'],
  'tools.extra.channel_keywords.seo_title':
    m['tools.extra.channel_keywords.seo_title'],
  'tools.extra.channel_keywords.seo_description':
    m['tools.extra.channel_keywords.seo_description'],
  'tools.extra.channel_keywords.eyebrow':
    m['tools.extra.channel_keywords.eyebrow'],
  'tools.extra.channel_keywords.submit':
    m['tools.extra.channel_keywords.submit'],
  'tools.extra.channel_keywords.step_2':
    m['tools.extra.channel_keywords.step_2'],
  'tools.extra.channel_keywords.step_3':
    m['tools.extra.channel_keywords.step_3'],
  'tools.extra.channel_keywords.benefit_export':
    m['tools.extra.channel_keywords.benefit_export'],
  'tools.extra.channel_keywords.faq_1_question':
    m['tools.extra.channel_keywords.faq_1_question'],
  'tools.extra.channel_keywords.faq_1_answer':
    m['tools.extra.channel_keywords.faq_1_answer'],
  'tools.extra.channel_assets.title': m['tools.extra.channel_assets.title'],
  'tools.extra.channel_assets.description':
    m['tools.extra.channel_assets.description'],
  'tools.extra.channel_assets.seo_title':
    m['tools.extra.channel_assets.seo_title'],
  'tools.extra.channel_assets.seo_description':
    m['tools.extra.channel_assets.seo_description'],
  'tools.extra.channel_assets.eyebrow': m['tools.extra.channel_assets.eyebrow'],
  'tools.extra.channel_assets.submit': m['tools.extra.channel_assets.submit'],
  'tools.extra.channel_assets.step_2': m['tools.extra.channel_assets.step_2'],
  'tools.extra.channel_assets.step_3': m['tools.extra.channel_assets.step_3'],
  'tools.extra.channel_assets.benefit_export':
    m['tools.extra.channel_assets.benefit_export'],
  'tools.extra.channel_assets.faq_1_question':
    m['tools.extra.channel_assets.faq_1_question'],
  'tools.extra.channel_assets.faq_1_answer':
    m['tools.extra.channel_assets.faq_1_answer'],
} as const;

export function tDynamic(key: string): string {
  const message = dynamicMessages[key as keyof typeof dynamicMessages];
  return message ? message() : key;
}
