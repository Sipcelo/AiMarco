import { test, expect } from '@playwright/test'

test('booking sexta-feira — regina-s-hair', async ({ page }) => {
  const apiCalls: { method: string; url: string; status: number; body?: string }[] = []

  page.on('response', async response => {
    const url = response.url()
    if (url.includes('aimarco') || url.includes('railway')) {
      let body = ''
      try { body = await response.text() } catch {}
      apiCalls.push({ method: response.request().method(), url, status: response.status(), body: body.slice(0, 300) })
    }
  })

  await page.goto('https://aimarco.up.railway.app/p/regina-s-hair')
  await page.waitForLoadState('networkidle')

  // Step 1: serviço
  await expect(page.getByText('Corte')).toBeVisible({ timeout: 10000 })
  await page.getByText('Corte').click()
  await page.getByText('PRÓXIMO').click()

  // Step 2: navegar até sexta-feira (2026-05-29)
  await page.waitForLoadState('networkidle')

  // Procurar pelo dia 30 no calendário — sexta é dia 30/05/2026 (hoje 28/05 é quinta)
  // Tentar clicar em "30" no calendário
  const fridayBtn = page.locator('text=30').first()
  await fridayBtn.waitFor({ state: 'visible', timeout: 8000 })
  await fridayBtn.click()
  await page.waitForLoadState('networkidle')

  // Pegar primeiro slot disponível na sexta
  const firstSlot = page.locator('span').filter({ hasText: /^\d{2}:\d{2}$/ }).first()
  await firstSlot.waitFor({ state: 'visible', timeout: 8000 })
  const slotTime = await firstSlot.textContent()
  await firstSlot.click()
  await page.getByText('PRÓXIMO').click()

  // Step 3: dados cliente
  await expect(page.getByText('Seus dados')).toBeVisible()
  await page.getByPlaceholder('Seu nome').fill('Teste Sexta Push')
  await page.getByPlaceholder('(53) 99912-9090').fill('(53) 99988-7766')
  await page.getByText('REVISAR').click()

  // Step 4: confirmar
  await expect(page.getByText('Confirmar Agendamento')).toBeVisible({ timeout: 5000 })
  await page.getByText('Confirmar Agendamento').click()

  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)

  const isSuccess = await page.getByText('Agendado').isVisible().catch(() => false)
    || await page.getByText('confirmado').isVisible().catch(() => false)
    || await page.getByText('Sucesso').isVisible().catch(() => false)

  console.log('\n=== RESULTADO ===')
  console.log('Horário selecionado:', slotTime)
  console.log('Sucesso na tela:', isSuccess)
  console.log('\n=== API CALLS ===')
  for (const c of apiCalls) {
    console.log(`${c.status} ${c.method} ${c.url}`)
    if (c.method === 'POST') console.log('  →', c.body)
  }

  expect(isSuccess).toBe(true)
})
