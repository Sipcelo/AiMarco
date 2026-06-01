import { test, expect } from '@playwright/test'

// Smoke E2E do booking público oficial (/p/:slug).
// Lê dados reais do backend; asserts são resilientes a drift de preço/serviços
// extras — validam a identidade do profissional e a navegação do fluxo.
test.describe('/p/regina-s-hair — professional booking page', () => {

  test('loads professional identity', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/p/regina-s-hair')
    await page.waitForLoadState('networkidle')

    // Professional name visible
    await expect(page.getByText('Regina S. Hair')).toBeVisible()

    // Business type badge
    await expect(page.getByText('Cabelereiro')).toBeVisible()

    // No JS errors
    expect(errors).toHaveLength(0)

    // No "Link inválido" visible
    await expect(page.getByText('Link inválido')).not.toBeVisible()
  })

  test('shows services list', async ({ page }) => {
    await page.goto('/p/regina-s-hair')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Escolha o serviço')).toBeVisible()
    // Serviço cadastrado da profissional demo
    await expect(page.getByText('Corte Feminino')).toBeVisible()
    // Pelo menos um preço em R$ deve ser exibido (resiliente a mudança de valor)
    await expect(page.getByText(/R\$\s?\d/).first()).toBeVisible()
  })

  test('can select service and advance to date step', async ({ page }) => {
    await page.goto('/p/regina-s-hair')
    await page.waitForLoadState('networkidle')

    await page.getByText('Corte Feminino').click()
    await page.getByText('PRÓXIMO').click()

    await expect(page.getByText('Data e horário')).toBeVisible()
  })

  test('can fill client info', async ({ page }) => {
    await page.goto('/p/regina-s-hair')
    await page.waitForLoadState('networkidle')

    // Step 1: select service
    await page.getByText('Corte Feminino').click()
    await page.getByText('PRÓXIMO').click()

    // Step 2: a primeira data disponível é auto-selecionada; pegar primeiro slot
    await page.waitForLoadState('networkidle')
    const firstSlot = page.locator('span').filter({ hasText: /^\d{2}:\d{2}$/ }).first()
    await firstSlot.waitFor({ state: 'visible', timeout: 8000 })
    await firstSlot.click()
    await page.getByText('PRÓXIMO').click()

    // Step 3: client info
    await expect(page.getByText('Seus dados')).toBeVisible()
    await page.getByPlaceholder('Seu nome').fill('Cliente Teste')
    await page.getByPlaceholder('(53) 99912-9090').fill('(53) 99999-9999')

    await expect(page.getByText('REVISAR')).toBeEnabled()
  })

  test('example-s still works as demo', async ({ page }) => {
    await page.goto('/example-s')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Auralynne Salao')).toBeVisible()
  })

  test('example-m still works as demo', async ({ page }) => {
    await page.goto('/example-m')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Auralynne Nails')).toBeVisible()
  })
})
