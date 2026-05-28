# @Designer — PROMPT: FIGMA DESIGN
## Tarefa: Criar Wizard de Onboarding para AiMarco Mobile
### Plataforma: React Native + Expo (mobile-first)
### Output: Figma → Export → React Native Componentes

---

## CONTEXTO DO PROJETO

**AiMarco** é uma plataforma de agendamento para profissionais independentes (barbeiros, manicures, mecânicos).

**Wizard de onboarding** (Tarefa B4b do roadmap):
- 5 telas sequenciais
- Profissional cria conta → configura serviços → configura disponibilidade
- Design mobile-first (375px de largura — iPhone 12)
- Tema: **quente, acessível, moderno**

---

## 1. PALETA DE CORES (Confirmada)

### Cores Primárias (Warm Aesthetic — baseado em trabalho anterior de Regina S. Hair)
```
Dourado/Âmbar: #D4A574 (principal, CTAs, highlights)
Bege escuro: #8B7355 (texto secundário, borders)
Creme: #F5F1ED (backgrounds, cards)
Preto/Cinza escuro: #2C2C2C (texto principal)
Branco: #FFFFFF (cards principais)
```

### Cores Semânticas
```
Sucesso: #4CAF50 (confirmações)
Erro: #E53935 (validações)
Info: #1976D2 (dicas)
Warning: #FB8C00 (atenções)
```

### Gradientes (opcional, para destaque)
```
Amber Gradient: #D4A574 → #C49060 (botões principais)
```

---

## 2. TIPOGRAFIA

```
Heading 1 (telas): 
  - Font: Poppins Bold (ou Inter Bold)
  - Size: 28px
  - Weight: 700
  - Color: #2C2C2C
  - Line height: 1.2

Heading 2 (seções):
  - Font: Poppins SemiBold
  - Size: 20px
  - Weight: 600
  - Color: #2C2C2C

Body (descrições):
  - Font: Inter Regular
  - Size: 16px
  - Weight: 400
  - Color: #2C2C2C (ou #8B7355 para secundário)
  - Line height: 1.5

Small (labels, hints):
  - Font: Inter Regular
  - Size: 14px
  - Weight: 400
  - Color: #8B7355
  - Line height: 1.4
```

**Download fontes:**
- Poppins: https://fonts.google.com/specimen/Poppins
- Inter: https://fonts.google.com/specimen/Inter

---

## 3. ESTRUTURA DO WIZARD (5 TELAS)

### Screen 1: SignUp
```
┌─────────────────────────────────────┐
│  AiMarco                            │ ← Logo + Título
├─────────────────────────────────────┤
│                                     │
│  Crie sua conta para começar        │ ← Heading
│  Seu negócio merece destaque        │ ← Subtitle
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Email                           ││ ← Input field
│  │ [_______________]               ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Senha                           ││ ← Input field
│  │ [_______________]               ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │     CRIAR CONTA                 │ ← Primary CTA (Amber)
│  └─────────────────────────────────┘│
│                                     │
│  Já tem conta? Faça login aqui      │ ← Secondary link
│                                     │
└─────────────────────────────────────┘

Progress Bar: ■□□□□ (1/5)
```

### Screen 2: ProfileSetup
```
┌─────────────────────────────────────┐
│  Perfil Profissional                │ ← Heading
│  Conte um pouco sobre você          │ ← Subtitle
├─────────────────────────────────────┤
│  Progress: ■■□□□ (2/5)              │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Nome completo                   ││
│  │ [João Silva____________]        ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Como quer ser chamado?          ││
│  │ [João______________]            ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Tipo de negócio                 ││
│  │ ┌─ Barbershop                   ││ ← Picker/Dropdown
│  │ └─ Salão de beleza              ││
│  │ ┌─ Manicure                     ││
│  │ └─ Mecânica                     ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Telefone                        ││
│  │ [(11) 99999-9999]               ││ ← Masked input
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │       PRÓXIMO                   │ ← CTA (Amber)
│  └─────────────────────────────────┘│
│                                     │
│  ← Voltar (ghost button)            │
└─────────────────────────────────────┘
```

### Screen 3: ServicesSetup
```
┌─────────────────────────────────────┐
│  Seus Serviços                      │ ← Heading
│  Adicione seus principais serviços  │ ← Subtitle
├─────────────────────────────────────┤
│  Progress: ■■■□□ (3/5)              │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────────┐│
│  │ + Adicionar Serviço             │ ← Add button (outline Amber)
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Corte Básico                  ✎ │ ← Service card (editable)
│  │ 30 min • R$ 50,00             ✕ │ ← Duration + Price + Actions
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Barba                         ✎ │
│  │ 45 min • R$ 35,00             ✕ │
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Corte + Barba                 ✎ │
│  │ 60 min • R$ 80,00             ✕ │
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │       PRÓXIMO                   │
│  └─────────────────────────────────┘│
│  ← Voltar                           │
└─────────────────────────────────────┘
```

### Screen 4: AvailabilitySetup
```
┌─────────────────────────────────────┐
│  Sua Disponibilidade                │ ← Heading
│  Quando você atende seus clientes?  │ ← Subtitle
├─────────────────────────────────────┤
│  Progress: ■■■■□ (4/5)              │
├─────────────────────────────────────┤
│                                     │
│  Segunda                            │ ← Day label
│  ◉ Fechado  ○ Aberto → 09:00-18:00 │ ← Toggle + time
│                                     │
│  Terça                              │
│  ○ Fechado  ◉ Aberto → 09:00-18:00 │ ← Toggle + time
│                                     │
│  Quarta                             │
│  ○ Fechado  ◉ Aberto → 09:00-18:00 │
│                                     │
│  Quinta                             │
│  ○ Fechado  ◉ Aberto → 09:00-18:00 │
│                                     │
│  Sexta                              │
│  ○ Fechado  ◉ Aberto → 09:00-18:00 │
│                                     │
│  Sábado                             │
│  ○ Fechado  ◉ Aberto → 10:00-16:00 │
│                                     │
│  Domingo                            │
│  ◉ Fechado  ○ Aberto → --:-- --:-- │
│                                     │
│  ┌─────────────────────────────────┐│
│  │       PRÓXIMO                   │
│  └─────────────────────────────────┘│
│  ← Voltar                           │
└─────────────────────────────────────┘
```

### Screen 5: OnboardingComplete
```
┌─────────────────────────────────────┐
│                                     │
│          ✓                          │ ← Success icon (large, Amber)
│                                     │
│  Tudo pronto!                       │ ← Heading
│  Seu negócio está configurado       │ ← Subtitle
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Seu link público:               ││
│  │                                 ││
│  │ aimarco.com.br/p/joao-silva    ││ ← Copiável
│  │                         [COPY]  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │   COMPARTILHAR LINK             │ ← Share CTA (Amber)
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │   IR PARA MINHA AGENDA          │ ← Primary CTA
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## 4. COMPONENTES REUTILIZÁVEIS

### Input Field
```
Height: 56px
Border radius: 8px
Background: #F5F1ED
Border: 1px solid #D4A574
Padding: 16px
Font: Inter 16px
Focus state: Border #D4A574 (2px), Shadow subtle
Error state: Border #E53935, Error text below (12px, red)
```

### Primary Button (CTA)
```
Height: 56px
Border radius: 8px
Background: #D4A574 (Amber)
Text: #FFFFFF (white, Poppins 16px bold)
Padding: 0 24px
Shadow: subtle (0 2px 8px rgba(0,0,0,0.1))
Hover state: Background #C49060 (darker)
Disabled state: Opacity 0.5, cursor not-allowed
```

### Secondary Button (Outline)
```
Height: 56px
Border radius: 8px
Background: transparent
Border: 2px solid #D4A574
Text: #D4A574 (Poppins 16px)
Hover state: Background #F5F1ED
```

### Ghost Button (Link-style)
```
Height: auto
Background: transparent
Border: none
Text: #D4A574 (underlined, 16px)
Padding: 8px 0
Hover state: Text darker (#C49060)
```

### Toggle Switch (for availability)
```
Width: 52px
Height: 32px
Border radius: 16px
Background OFF: #CCCCCC
Background ON: #D4A574
Circle: 28px, white
Transition: 300ms ease
```

### Time Picker Input
```
Height: 56px
Font: Inter 16px
Placeholder: "--:--"
Format: HH:MM (24h)
Keyboard: numeric
```

### Service Card (editable)
```
Height: 72px
Background: #FFFFFF
Border: 1px solid #E0E0E0
Border radius: 12px
Padding: 16px
Layout: Row [Title + Duration + Price] [Edit icon] [Delete icon]
Hover state: Shadow, Border #D4A574
```

### Progress Bar
```
Height: 4px
Background: #E0E0E0
Filled color: #D4A574
Segments: 5
Current: filled
Animation: smooth width transition
```

---

## 5. LAYOUT TÉCNICO (Mobile — 375px)

```
Safe area (React Native):
- Top: 0px (status bar 44px)
- Bottom: 34px (home indicator)
- Left/Right: 0px
- Content padding: 24px (horizontal)

Screens size:
- Width: 375px (iPhone 12)
- Height: 812px (full screen)
- ScrollView: quando conteúdo > viewport

Spacing:
- 8px, 12px, 16px, 24px, 32px (múltiplos de 4)
- Between inputs: 24px
- Between sections: 32px
```

---

## 6. FLOW STATES & VALIDATIONS

### SignUp Screen
```
Email validation:
- Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- Error: "Email inválido"

Password validation:
- Min 8 chars
- At least 1 uppercase, 1 number, 1 special char
- Error: "Senha deve ter 8+ caracteres, 1 maiúscula, 1 número"

Button disabled: até ambos campos forem válidos

API call: POST /v1/auth/signup
Loading state: Button text → "Criando..." (disabled)
Error state: Toast at bottom (red background, white text)
Success state: Navigate to Screen 2
```

### ProfileSetup Screen
```
Full name validation: min 3 chars, max 100 chars
Display name: auto-generated from full_name (kebab-case) mas editável
Business type: required picker selection
Phone: Brazilian format (+55 DDD + 9/8 dígitos) via masked input

API call: PATCH /v1/professionals/:id/profile
Loading: Button → "Salvando..."
```

### ServicesSetup Screen
```
Add Service flow:
1. Click "+ Adicionar Serviço"
2. Modal/sheet pops up with form:
   - Name (text input)
   - Duration (picker: 15/30/45/60/90/120 min)
   - Price (optional, currency input)
   - Save button
3. Service card appears in list

Delete service: Swipe left (iOS) or long-press → delete confirmation

API call: POST /v1/professionals/:id/services (for each)
```

### AvailabilitySetup Screen
```
Toggle behavior:
- "Fechado" = disabled fields (grayed out)
- "Aberto" = time pickers enabled

Time pickers:
- Início: click → TimePickerModal
- Fim: click → TimePickerModal
- Format: 24h (09:00, 14:30, etc)

Save on change: Auto-save as user toggles (no explicit button needed for this screen)
But "PRÓXIMO" button still present for UX consistency

API call: POST /v1/professionals/:id/availability (for each day)
```

### OnboardingComplete Screen
```
Success animation:
- Checkmark icon: scales in + fade (300ms)
- Confetti (optional, subtle) — use react-native-confetti or particles

Copy link:
- Press [COPY] button → Toast: "Link copiado!"
- Actually copies: "https://aimarco.com.br/p/{slug}"

Share link:
- Opens native share sheet (React Native Share API)
- Shares URL + message: "Agende comigo no AiMarco: https://..."

Navigate to Schedule:
- "IR PARA MINHA AGENDA" → navigates to ScheduleScreen
- Clears wizard state (doesn't show on re-enter if complete)
```

---

## 7. FIGMA SETUP INSTRUCTIONS

### Create New File
```
1. Figma.com → New File → "AiMarco Onboarding Wizard"
2. Add shared colors library (from your brand kit, if exists)
3. Create component set for each UI element
```

### File Structure (Layers)
```
📁 AiMarco Onboarding Wizard
├── 📁 Screens
│   ├── Screen 1 — SignUp
│   ├── Screen 2 — ProfileSetup
│   ├── Screen 3 — ServicesSetup
│   ├── Screen 4 — AvailabilitySetup
│   └── Screen 5 — OnboardingComplete
├── 📁 Components
│   ├── Inputs
│   │   ├── TextInput
│   │   ├── PasswordInput
│   │   └── PhoneInput (masked)
│   ├── Buttons
│   │   ├── ButtonPrimary
│   │   ├── ButtonSecondary
│   │   └── ButtonGhost
│   ├── Controls
│   │   ├── Toggle
│   │   ├── TimePicker
│   │   └── Picker/Dropdown
│   ├── Cards
│   │   └── ServiceCard
│   └── Misc
│       ├── ProgressBar
│       ├── SuccessIcon
│       └── Header
├── 📁 Colors
│   └── (Palette swatches)
└── 📁 Typography
    └── (Text styles)
```

### Export Options (Figma → React Native)

**Option A: Use Figma Plugin (Recommended)**
```
1. Install: "Locofy.AI" or "Anima"
2. Select all screens
3. Export → React Native
4. Download code + assets
5. Adapt for Expo
```

**Option B: Manual Export**
```
1. For each component: Right-click → Export
2. Format: SVG (for icons) + PNG (for previews)
3. Document component props in Storybook or .md file
4. Manually code in React Native
```

**Option C: Design-to-Code (Best for learning)**
```
1. Export as PDF or images
2. I'll convert to React Native components
3. You iterate on design
4. Rinse and repeat
```

---

## 8. NEXT STEPS (After Figma Design)

1. ✅ **Design in Figma** (use this brief)
2. ✅ **Export components** (use Option A, B, or C)
3. ✅ **Code in React Native** (I'll create PROMPT #3)
4. ✅ **Integrate with AiMarco Backend** (API calls)
5. ✅ **Test end-to-end** (Checkpoint 2 for wizard)

---

## 📋 CHECKLIST — Antes de exportar

- [ ] 5 screens criadas
- [ ] Cores aplicadas (Amber #D4A574, Bege #F5F1ED, etc)
- [ ] Tipografia correta (Poppins + Inter)
- [ ] Todos componentes reutilizáveis
- [ ] Progress bar em todas as telas (exceto Screen 5)
- [ ] Estados hover/focus/disabled nos botões
- [ ] Spacing consistente (múltiplos de 4)
- [ ] 375px width (iPhone 12 constraint)
- [ ] Componentes nomeados para export
- [ ] Responsive behavior documentado

---

**Próximo passo:** 
1. Abra Figma
2. Siga este brief
3. Envie o link do Figma aqui
4. Eu crio um PROMPT de conversão para React Native + exportação

**Quer começar? 🎨**