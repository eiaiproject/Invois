import { expect, test, type Locator, type Page } from '@playwright/test';

/* Landing page rendering, contrast, and keyboard checks.
   Assertions read computed styles after the state is applied, so they fail on
   real regressions instead of on token names. */

const INTERACTIVE: ReadonlyArray<readonly [string, string]> = [
  ['hero primary CTA', '.l-cta-primary'],
  ['hero secondary CTA', '.l-hero-actions .btn-secondary'],
  ['header dashboard link', '.l-header-actions .btn-secondary'],
  ['brand link', '.l-header .brand'],
  ['nav link', '.l-nav a'],
  ['final CTA', '.l-cta .btn-primary'],
];

const VIEWPORTS = [320, 375, 390, 640, 768, 1024, 1280, 1440];

function channel(value: string): number {
  const match = value.match(/-?[\d.]+/g);
  if (!match) throw new Error(`Unparseable color: ${value}`);
  return Number(match[0]);
}

function luminance(color: string): number {
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  const [r, g, b] = parts.slice(0, 3).map(value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

type Rendered = { color: string; background: string };

/* Colors are composited in the page so translucent and modern color syntaxes
   (the sticky header is oklch at 92% alpha) are measured as rendered. */
async function readRendered(locator: Locator): Promise<Rendered> {
  return locator.evaluate((el) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d context unavailable');
    const rgbaOf = (color: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return [data[0], data[1], data[2], data[3] / 255];
    };
    const over = (fg: number[], bg: number[]): number[] => {
      const a = fg[3];
      return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
    };

    const chain: string[] = [];
    let node: HTMLElement | null = el as HTMLElement;
    while (node) {
      const value = getComputedStyle(node).backgroundColor;
      if (value && value !== 'rgba(0, 0, 0, 0)') chain.push(value);
      node = node.parentElement;
    }
    let background = [255, 255, 255, 1];
    for (let i = chain.length - 1; i >= 0; i -= 1) background = over(rgbaOf(chain[i]!), background);
    const foreground = over(rgbaOf(getComputedStyle(el).color), background);

    const format = (c: number[]) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
    return { color: format(foreground), background: format(background) };
  });
}

async function expectReadable(locator: Locator, label: string, minimum = 4.5): Promise<void> {
  const rendered = await readRendered(locator);
  const ratio = contrastRatio(rendered.color, rendered.background);
  expect(
    ratio,
    `${label}: ${rendered.color} on ${rendered.background} = ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(minimum);
}

async function pressActive(locator: Locator, page: Page): Promise<void> {
  await locator.hover();
  await page.mouse.down();
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`landing contrast (${scheme})`, () => {
    test(`text stays readable in default, hover, active and visited (${scheme})`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');

      for (const [label, selector] of INTERACTIVE) {
        const locator = page.locator(selector).first();
        await expect(locator, `${label} should be visible`).toBeVisible();
        await expectReadable(locator, `${label} default`);

        await locator.hover();
        await expectReadable(locator, `${label} hover`);

        await pressActive(locator, page);
        await expectReadable(locator, `${label} active`);
        await page.mouse.move(2, 2);
        await page.mouse.up();
      }

      // Visit the CTA target so the links render in :visited state.
      await page.goto('/documents/new/invoice');
      await page.goto('/');
      for (const [label, selector] of INTERACTIVE) {
        await expectReadable(page.locator(selector).first(), `${label} visited`);
      }
    });
  });
}

test('keyboard focus ring is visible on every focusable landing element', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const seen: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        text: (el.textContent ?? '').trim().slice(0, 24),
        focusVisible: el.matches(':focus-visible'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: Number.parseFloat(cs.outlineWidth),
        outlineColor: cs.outlineColor,
      };
    });
    if (!info) break;
    seen.push(`${info.text}:${info.outlineWidth}px ${info.outlineStyle}`);
    expect(info.focusVisible, `${info.text} should match :focus-visible`).toBe(true);
    expect(info.outlineStyle, `${info.text} needs an outline`).not.toBe('none');
    expect(info.outlineWidth, `${info.text} outline too thin`).toBeGreaterThanOrEqual(2);
  }
  expect(seen.length, 'expected several focusable elements').toBeGreaterThanOrEqual(8);
});

test('mobile menu is operable with the keyboard only', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) >= 1024, 'hamburger only exists below 1024px');
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.getByLabel('Open menu');
  const drawerLink = page.locator('#mobile-nav a').first();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(drawerLink).toBeHidden();

  // Closed drawer must not be reachable by keyboard.
  const closedFocusable = await drawerLink.evaluate((el) => {
    (el as HTMLElement).focus();
    return document.activeElement === el;
  });
  expect(closedFocusable).toBe(false);

  await toggle.focus();
  const toggleOutline = await toggle.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.outlineStyle, width: Number.parseFloat(cs.outlineWidth), focusVisible: el.matches(':focus-visible') };
  });
  expect(toggleOutline.focusVisible, 'hamburger should match :focus-visible').toBe(true);
  expect(toggleOutline.style).not.toBe('none');
  expect(toggleOutline.width).toBeGreaterThanOrEqual(2);

  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Close menu')).toHaveAttribute('aria-expanded', 'true');
  await expect(drawerLink).toBeVisible();

  await page.keyboard.press('Tab');
  const focusedInDrawer = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      inDrawer: Boolean(el.closest('#mobile-nav')),
      outlineStyle: cs.outlineStyle,
      outlineWidth: Number.parseFloat(cs.outlineWidth),
    };
  });
  expect(focusedInDrawer?.inDrawer, 'focus should move into the drawer').toBe(true);
  expect(focusedInDrawer?.outlineStyle).not.toBe('none');
  expect(focusedInDrawer?.outlineWidth).toBeGreaterThanOrEqual(2);

  await page.keyboard.press('Escape');
  await expect(drawerLink).toBeHidden();
  await expect(page.getByLabel('Open menu')).toBeFocused();

  // Opening again and choosing a link closes the drawer and scrolls the section into view.
  await page.keyboard.press('Enter');
  await expect(drawerLink).toBeVisible();
  await drawerLink.click();
  await expect(drawerLink).toBeHidden();
  await expect(page.locator('#workflow h2')).toBeInViewport();
});

test('no horizontal overflow from 320px to 1440px', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.right > doc.clientWidth + 1 || rect.left < -1);
        })
        .slice(0, 4)
        .map((el) => `${el.tagName}.${el.className || 'none'}`);
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
    });
    expect(metrics.offenders, `elements outside the viewport at ${width}px`).toEqual([]);
    expect(metrics.scrollWidth, `document overflows at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth + 1);
  }
});

test('anchor targets clear the sticky header', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  for (const [label, heading] of [['How it works', '#workflow h2'], ['What you get', '#features h2'], ['Privacy & limits', '#trust h2']]) {
    await page.getByRole('link', { name: label, exact: true }).first().click();
    const headerHeight = await page.locator('.l-header').evaluate((el) => el.getBoundingClientRect().height);
    const top = await page.locator(heading).evaluate((el) => el.getBoundingClientRect().top);
    expect(top, `${heading} should sit below the sticky header`).toBeGreaterThanOrEqual(headerHeight - 1);
  }
});

test('reduced motion keeps every revealed block visible', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const heroAnimation = await page.locator('.l-hero-heading').evaluate((el) => getComputedStyle(el).animationName);
  expect(heroAnimation).toBe('none');

  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(['auto', 'initial']).toContain(scrollBehavior);

  const hidden = await page.locator('[data-reveal]').evaluateAll((els) =>
    els
      .filter((el) => Number.parseFloat(getComputedStyle(el).opacity) < 1)
      .map((el) => `${el.tagName}.${el.className || 'none'}`),
  );
  expect(hidden).toEqual([]);
});

test('mock preview exposes no fake controls', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const controls = page.locator('.l-control-btn');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    await expect(control).toHaveJSProperty('tagName', 'SPAN');
    await expect(control).toHaveCSS('cursor', 'default');
    expect(await control.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    const before = await control.evaluate((el) => getComputedStyle(el).borderColor);
    await control.hover();
    const after = await control.evaluate((el) => getComputedStyle(el).borderColor);
    expect(after, 'decorative control must not react to hover').toBe(before);
  }

  // Paid state carries an icon plus a text label, never colour alone.
  const badge = page.locator('.l-status-paid');
  await expect(badge).toContainText('Paid');
  expect(await badge.locator('svg').count()).toBeGreaterThan(0);

  // The whole preview is decorative and described once.
  await expect(page.locator('.l-preview-stage')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.l-preview figcaption')).toHaveText(/paid invoice/i);
});

test('mobile hero stays usable at 320px', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');

  const actions = page.locator('.l-hero-actions');
  const buttons = actions.locator('.btn');
  await expect(buttons).toHaveCount(2);
  const [primary, secondary] = [buttons.nth(0), buttons.nth(1)];

  const boxes = await Promise.all([primary.boundingBox(), secondary.boundingBox()]);
  expect(boxes[0], 'primary CTA should render').not.toBeNull();
  expect(boxes[1], 'secondary CTA should render').not.toBeNull();
  const actionsWidth = (await actions.boundingBox())!.width;
  expect(boxes[0]!.width, 'primary CTA fills the row').toBeGreaterThan(actionsWidth * 0.9);
  expect(boxes[1]!.width, 'secondary CTA fills the row').toBeGreaterThan(actionsWidth * 0.9);
  expect(boxes[1]!.y, 'CTAs stack instead of sitting side by side').toBeGreaterThan(boxes[0]!.y + boxes[0]!.height - 1);

  // Labels are not clipped and the mock document stays legible.
  const labelBox = await primary.boundingBox();
  const scrollWidth = await primary.evaluate((el) => el.scrollWidth);
  expect(scrollWidth, 'CTA label should fit its button').toBeLessThanOrEqual(Math.ceil(labelBox!.width));

  const previewFont = await page.locator('.l-items td.name-col').first().evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(previewFont, 'mock invoice text stays readable').toBeGreaterThanOrEqual(11);

  const heroHeight = await page.locator('.l-hero').evaluate((el) => el.getBoundingClientRect().height);
  expect(heroHeight, 'hero should not fill more than two viewports').toBeLessThan(1440);
});

test('hero highlights sit in a symmetric grid at every width', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const list = page.locator('.l-hero-assurance');
  await expect(list.locator('li')).toHaveCount(4);

  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await list.evaluate((el) => {
      const items = Array.from(el.querySelectorAll('li'));
      const rows = new Map<number, number[]>();
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const key = Math.round(rect.y);
        rows.set(key, [...(rows.get(key) ?? []), Math.round(rect.width)]);
      }
      return {
        columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
        rows: [...rows.values()],
        clipped: items
          .filter((item) => item.scrollWidth > item.clientWidth + 1)
          .map((item) => item.textContent ?? ''),
      };
    });

    const columns = width >= 720 ? 4 : 2;
    const rowCount = width >= 720 ? 1 : 2;
    expect(metrics.columns, `${width}px should lay the highlights out in a grid`).toBe(columns);
    expect(metrics.rows.length, `${width}px should not leave an orphan pill in the last row`).toBe(rowCount);
    for (const row of metrics.rows) {
      expect(row.length, `${width}px row should hold every column`).toBe(columns);
      expect(Math.max(...row) - Math.min(...row), `${width}px pills should share one width`).toBeLessThanOrEqual(1);
    }
    expect(metrics.clipped, `${width}px labels should not be clipped`).toEqual([]);
  }
});

test('heading structure and skip link behave as expected', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const headings = await page.locator('h1, h2, h3').evaluateAll((els) =>
    els.map((el) => Number.parseInt(el.tagName.slice(1), 10)),
  );
  expect(headings.filter((level) => level === 1)).toHaveLength(1);
  expect(headings[0]).toBe(1);
  headings.slice(1).forEach((level, index) => {
    expect(level - headings[index]!, `heading level jumped at index ${index}`).toBeLessThanOrEqual(1);
  });

  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('text stays distinguishable in forced colors mode', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  for (const [label, selector] of INTERACTIVE) {
    const rendered = await readRendered(page.locator(selector).first());
    const ratio = contrastRatio(rendered.color, rendered.background);
    expect(ratio, `${label} in forced colors: ${rendered.color} on ${rendered.background}`).toBeGreaterThanOrEqual(4.5);
  }
});

test('landing renders desktop and mobile screenshots', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const shots: Array<[string, number, number]> = [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ];
  for (const [name, width, height] of shots) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    // Walk the page so scroll reveals fire before the capture.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    await testInfo.attach(`${name}-landing`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
});