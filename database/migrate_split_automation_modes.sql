alter table stores
  add column if not exists post_automation_mode automation_mode not null default 'approval',
  add column if not exists review_automation_mode automation_mode not null default 'approval';

update stores
set
  post_automation_mode = case
    when allow_low_risk_gbp_auto_post then
      case when automation_mode = 'approval' then 'semi_auto'::automation_mode else automation_mode end
    else 'approval'::automation_mode
  end,
  review_automation_mode = case
    when allow_template_review_auto_reply then
      case when automation_mode = 'full_auto' then 'full_auto'::automation_mode else 'semi_auto'::automation_mode end
    else 'approval'::automation_mode
  end
where exists (
  select 1
  from information_schema.columns
  where table_name = 'stores' and column_name = 'automation_mode'
);

alter table stores
  drop column if exists allow_template_review_auto_reply,
  drop column if exists allow_low_risk_gbp_auto_post,
  drop column if exists automation_mode;
