-- The first beta vertical: built-in furniture and kitchens.
with new_template as (
  insert into app.specification_templates (
    scope, organization_id, key, name_bg, name_en, version, active
  )
  select 'platform', null, 'furniture-kitchens',
         'Мебели и кухни по поръчка', 'Custom furniture and kitchens', 1, true
  where not exists (
    select 1
    from app.specification_templates
    where scope = 'platform'
      and organization_id is null
      and key = 'furniture-kitchens'
      and version = 1
  )
  returning id
), target_template as (
  select id from new_template
  union all
  select id
  from app.specification_templates
  where scope = 'platform'
    and organization_id is null
    and key = 'furniture-kitchens'
    and version = 1
  limit 1
), field_data(stable_key, section_key, section_label, label, field_type, unit, required, sort_order, options_json, config_json) as (
  values
    ('room', 'project', 'Проект', 'Помещение', 'single_select', null, true, 10, '["Кухня","Дневна","Спалня","Антре","Баня","Офис","Друго"]'::jsonb, null),
    ('style', 'project', 'Проект', 'Стил', 'single_select', null, false, 20, '["Модерен","Минималистичен","Класически","Индустриален","Скандинавски","Друг"]'::jsonb, null),
    ('site_notes', 'project', 'Проект', 'Особености на обекта', 'long_text', null, false, 30, null, null),
    ('overall_width', 'dimensions', 'Размери', 'Обща ширина', 'measurement', 'mm', true, 100, null, '{"min":1}'::jsonb),
    ('overall_height', 'dimensions', 'Размери', 'Обща височина', 'measurement', 'mm', true, 110, null, '{"min":1}'::jsonb),
    ('overall_depth', 'dimensions', 'Размери', 'Обща дълбочина/дълбочина', 'measurement', 'mm', true, 120, null, '{"min":1}'::jsonb),
    ('body_material', 'materials', 'Материали', 'Материал на корпусите', 'single_select', null, true, 200, '["ПДЧ 18 mm","MDF","Шперплат","Масив","Друг"]'::jsonb, null),
    ('body_colour', 'materials', 'Материали', 'Цвят на корпусите', 'colour', null, true, 210, null, null),
    ('front_material', 'materials', 'Материали', 'Материал на лицата', 'single_select', null, true, 220, '["ПДЧ","MDF фолио","MDF боя","Фурнир","Масив","Стъкло","Друг"]'::jsonb, null),
    ('front_colour', 'materials', 'Материали', 'Цвят на лицата', 'colour', null, true, 230, null, null),
    ('worktop_material', 'materials', 'Материали', 'Работен плот', 'single_select', null, false, 240, '["Ламинат","Компактен ламинат","Технически камък","Гранит","Масив","Без плот","Друг"]'::jsonb, null),
    ('worktop_thickness', 'materials', 'Материали', 'Дебелина на плота', 'measurement', 'mm', false, 250, null, '{"min":1}'::jsonb),
    ('handles', 'hardware', 'Обков', 'Отваряне и дръжки', 'single_select', null, true, 300, '["Дръжки","Gola профил","Фрезована дръжка","Push-to-open","Друг"]'::jsonb, null),
    ('hinges', 'hardware', 'Обков', 'Панти', 'single_select', null, false, 310, '["Стандартни с плавно затваряне","Премиум с плавно затваряне","Специални","Друг"]'::jsonb, null),
    ('drawer_system', 'hardware', 'Обков', 'Система за чекмеджета', 'single_select', null, false, 320, '["Стандартна","Пълно изтегляне","Премиум","Без чекмеджета","Друг"]'::jsonb, null),
    ('lighting', 'electrical', 'Осветление и ел. част', 'LED осветление', 'boolean', null, false, 400, null, null),
    ('lighting_notes', 'electrical', 'Осветление и ел. част', 'Описание на осветлението', 'long_text', null, false, 410, null, null),
    ('appliances', 'equipment', 'Уреди и оборудване', 'Уреди за вграждане', 'long_text', null, false, 500, null, null),
    ('installation_included', 'delivery', 'Доставка и монтаж', 'Монтажът е включен', 'boolean', null, true, 600, null, null),
    ('delivery_notes', 'delivery', 'Доставка и монтаж', 'Условия за доставка и монтаж', 'long_text', null, false, 610, null, null),
    ('reference_images', 'files', 'Файлове', 'Референтни изображения', 'image_gallery', null, false, 700, null, null),
    ('technical_drawing', 'files', 'Файлове', 'Технически чертеж', 'file', null, false, 710, null, null),
    ('additional_notes', 'notes', 'Допълнителни бележки', 'Бележки', 'long_text', null, false, 800, null, null)
)
insert into app.specification_template_fields (
  template_id, stable_key, section_key, section_label, label,
  field_type, unit, required, sort_order, options_json, config_json
)
select t.id, f.stable_key, f.section_key, f.section_label, f.label,
       f.field_type::app.specification_field_type, f.unit, f.required,
       f.sort_order, f.options_json, f.config_json
from target_template t
cross join field_data f
on conflict (template_id, stable_key) do nothing;
