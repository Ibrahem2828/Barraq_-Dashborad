import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_DASHBOARD_ADMIN_EMAIL;
const managerEmail = process.env.E2E_DASHBOARD_MANAGER_EMAIL;
const supervisorEmail = process.env.E2E_DASHBOARD_SUPERVISOR_EMAIL;
const studentEmail = process.env.E2E_STUDENT_EMAIL;
const adminPassword = process.env.E2E_DASHBOARD_ADMIN_PASSWORD;
const managerPassword = process.env.E2E_DASHBOARD_MANAGER_PASSWORD;
const supervisorPassword = process.env.E2E_DASHBOARD_SUPERVISOR_PASSWORD;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;

test.skip(
  !process.env.E2E_DASHBOARD_AVAILABLE ||
    !adminEmail ||
    !managerEmail ||
    !supervisorEmail ||
    !studentEmail ||
    !adminPassword ||
    !managerPassword ||
    !supervisorPassword ||
    !studentPassword,
  "Requires an isolated Django backend and E2E dashboard credentials supplied through the test secret store.",
);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/ar/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "دخول آمن" }).click();
  await page.waitForURL(
    (url) => url.pathname.startsWith("/ar") && url.pathname !== "/ar/login",
    { timeout: 10_000 },
  );
}

test.describe("Dashboard backend-authorized access", () => {
  test("a student account is refused before a dashboard session is created", async ({ page }) => {
    await page.goto("/ar/login");
    await page.getByLabel("البريد الإلكتروني").fill(studentEmail!);
    await page.getByLabel("كلمة المرور").fill(studentPassword!);
    await page.getByRole("button", { name: "دخول آمن" }).click();

    await expect(page.getByText("هذا الحساب غير مخوّل للوصول إلى لوحة التحكم")).toBeVisible();
    await expect(page).toHaveURL(/\/ar\/login$/);
  });

  test("a super admin can reach global and organization administration", async ({ page }) => {
    await signIn(page, adminEmail!, adminPassword!);

    await expect(page.getByRole("link", { name: "الأدوار والصلاحيات" })).toBeVisible();
    await expect(page.getByRole("link", { name: "المؤسسات" })).toBeVisible();

    await page.goto("/ar/organizations");
    await expect(page.getByRole("heading", { name: "المؤسسات" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "مدرسة الاختبار المحلية" })).toBeVisible();
  });

  test("an organization manager sees only authorized organization surfaces", async ({ page }) => {
    await signIn(page, managerEmail!, managerPassword!);

    await expect(page.getByRole("heading", { name: "مدرسة الاختبار المحلية" })).toBeVisible();
    await expect(page.getByRole("link", { name: "المؤسسات" })).toBeVisible();
    await expect(page.getByRole("link", { name: "الصفوف" })).toBeVisible();
    await expect(page.getByRole("link", { name: "طلبات الانضمام" })).toBeVisible();
    await expect(page.getByRole("link", { name: "الدعوات" })).toBeVisible();
    await expect(page.getByRole("link", { name: "الأدوار والصلاحيات" })).toHaveCount(0);

    await page.goto("/ar/roles");
    await expect(page.getByRole("heading", { name: "غير مصرح بالوصول" })).toBeVisible();

    await page.goto("/ar/organizations");
    await expect(page.getByText("مدرسة الاختبار المحلية")).toBeVisible();
  });

  test("a class supervisor is contained to their own class surfaces", async ({ page }) => {
    await signIn(page, supervisorEmail!, supervisorPassword!);

    await expect(page.getByRole("heading", { name: "الصفوف" })).toBeVisible();
    await expect(page.getByRole("link", { name: /الصف التجريبي أ مدرسة الاختبار المحلية/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "المؤسسات" })).toHaveCount(0);

    await page.goto("/ar/organizations");
    await expect(page.getByRole("heading", { name: "غير مصرح بالوصول" })).toBeVisible();
  });
});
