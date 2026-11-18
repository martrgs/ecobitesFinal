import { expect, test } from '@playwright/test';

const demoProducts = [
  {
    id: 73101,
    name: 'Leche de prueba',
    category: 'Lácteos',
    expiration: Date.now() + 2 * 86_400_000,
    quantity: '1 litro',
  },
  {
    id: 73102,
    name: 'Arroz de prueba',
    category: 'Granos y cereales',
    expiration: Date.now() + 20 * 86_400_000,
    quantity: '500 g',
  },
];

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('welcome and access')) return;
  await page.addInitScript((products) => {
    localStorage.setItem(
      'ecobites.session',
      JSON.stringify({
        id: 'playwright-demo',
        name: 'Mariana Demo',
        email: 'demo@example.com',
        provider: 'email',
      }),
    );
    localStorage.setItem('ecobites.demo@example.com.products', JSON.stringify(products));
  }, demoProducts);
  await page.route(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/, (route) => route.abort());
});

test('welcome and access form controls open the expected screens', async ({ page }) => {
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { name: /menos desperdicio/i })).toBeVisible();
  await page.getByRole('button', { name: 'Registrarse' }).click();
  await expect(page).toHaveURL(/\/auth\?mode=register/);
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  await expect(page.getByLabel('Nombre completo')).toBeVisible();
  await page.getByRole('button', { name: /inicia sesión/i }).click();
  await expect(page.getByRole('heading', { name: '¡Bienvenido de nuevo!' })).toBeVisible();
});

test('home, product search, filters, and editing keep the saved product data', async ({ page }) => {
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: /hola,/i })).toBeVisible();
  await expect(page.locator('app-home').getByText('Leche de prueba')).toBeVisible();

  await page.getByRole('button', { name: 'Productos' }).click();
  await expect(page.locator('app-products').getByRole('heading', { name: 'Mis productos' })).toBeVisible();
  await expect(page.locator('app-products').getByText('Arroz de prueba')).toBeVisible();
  await page.getByRole('button', { name: 'Por vencer' }).click();
  await expect(page.locator('app-products').getByText('Leche de prueba')).toBeVisible();
  await expect(page.locator('app-products').getByText('Arroz de prueba')).toHaveCount(0);
  await page.getByRole('button', { name: 'Al día' }).click();
  await expect(page.locator('app-products').getByText('Arroz de prueba')).toBeVisible();
  await expect(page.locator('app-products').getByText('Leche de prueba')).toHaveCount(0);

  await page.getByRole('button', { name: 'Todos' }).click();
  await page.locator('app-products').getByRole('button', { name: 'Opciones del producto' }).first().click();
  await page.getByRole('button', { name: 'Editar producto' }).click();
  await expect(page).toHaveURL(/\/edit-product\/\d+/);
  await expect(page.locator('input[name="name"]')).toHaveValue('Leche de prueba');
  await expect(page.locator('input[name="category"]')).toHaveValue('Lácteos');
});

test('menu navigation, search shortcut, settings dialogs, and local sign out work', async ({ page }) => {
  await page.goto('/menu');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.search input')).toBeFocused();

  await page.goto('/settings');
  await page.getByRole('button', { name: /privacidad/i }).click();
  await expect(page.getByRole('dialog')).toContainText('EcoBites guarda tu perfil');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByRole('button', { name: /acerca de ecobites/i }).click();
  await expect(page.getByRole('dialog')).toContainText('te ayuda a organizar tus alimentos');
  await page.getByRole('button', { name: 'Entendido' }).click();
  await page.getByLabel('Idioma').selectOption('English');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByLabel('Dark mode').check();
  await expect(page.locator('body')).toHaveClass(/dark-mode/);

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await expect(page.locator('.pantry-total strong')).toHaveText('2');
  await expect(page.locator('.pantry-expiring strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Account security' }).click();
  await expect(page.getByRole('dialog')).toContainText('Change password');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/menu');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  expect(await page.evaluate(() => localStorage.getItem('ecobites.session'))).toBeNull();
});

test('product form validates required fields before saving', async ({ page }) => {
  await page.goto('/add-product');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.locator('.error')).toContainText('El nombre debe tener de 2 a 50 caracteres');
  await expect(page).toHaveURL(/\/add-product$/);
});
