// Service categories mirror the five request-flow issues. All start as public + requires_review,
// meaning a dispatcher reviews every request. Owner can disable any category in Admin > Settings.
const m002 = `
INSERT INTO service_categories (slug, label, public_enabled, requires_review, sort_order) VALUES
  ('no-heat', 'No heat', true, true, 1),
  ('ac-not-cooling', 'AC not cooling', true, true, 2),
  ('noise-leak-airflow', 'Strange noise, leak, or airflow', true, true, 3),
  ('maintenance', 'Tune-up / maintenance', true, true, 4),
  ('other', 'Something else', true, true, 5)
ON CONFLICT (slug) DO NOTHING;
`;
export default m002;
