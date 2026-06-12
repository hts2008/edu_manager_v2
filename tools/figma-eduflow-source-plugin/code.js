const COLLECTION_NAME = "EduFlow Production Tokens";
const PREFIX = "UXM-02 / Native Source /";

const COLORS = {
  "color/brand/primary": "#4F46E5",
  "color/brand/primarySoft": "#EEF2FF",
  "color/brand/primaryDark": "#312E81",
  "color/surface/canvas": "#F5F7FB",
  "color/surface/card": "#FFFFFF",
  "color/text/strong": "#0F172A",
  "color/text/muted": "#64748B",
  "color/border/default": "#E2E8F0",
  "color/status/success": "#10B981",
  "color/status/successSoft": "#ECFDF5",
  "color/status/warning": "#F59E0B",
  "color/status/warningSoft": "#FFFBEB",
  "color/status/danger": "#EF4444"
};

const FONT_REGULAR = { family: "Inter", style: "Regular" };
const FONT_BOLD = { family: "Inter", style: "Bold" };
let canUseBoldFont = false;

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  const value = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255
  };
}

function colorValue(hex) {
  const rgb = hexToRgb(hex);
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 };
}

async function getOrCreateCollection() {
  if (
    !figma.variables ||
    !figma.variables.getLocalVariableCollectionsAsync ||
    !figma.variables.getLocalVariablesAsync ||
    !figma.variables.createVariableCollection ||
    !figma.variables.createVariable ||
    !figma.variables.setBoundVariableForPaint
  ) {
    throw new Error("This Figma runtime does not support Variables API.");
  }
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const existing = collections.find((collection) => collection.name === COLLECTION_NAME);
  return existing || figma.variables.createVariableCollection(COLLECTION_NAME);
}

async function getOrCreateColorVariable(collection, name, hex) {
  const variables = await figma.variables.getLocalVariablesAsync("COLOR");
  let variable = variables.find(
    (item) => item.name === name && item.variableCollectionId === collection.id
  );
  if (!variable) {
    variable = figma.variables.createVariable(name, collection, "COLOR");
  }
  const modeId = collection.defaultModeId || collection.modes[0].modeId;
  variable.setValueForMode(modeId, colorValue(hex));
  return variable;
}

function boundPaint(variable, fallbackHex) {
  const paint = {
    type: "SOLID",
    color: hexToRgb(fallbackHex || "#FFFFFF"),
    opacity: 1
  };
  return figma.variables.setBoundVariableForPaint(paint, "color", variable);
}

function setBoundFill(node, variables, tokenName) {
  node.fills = [boundPaint(variables[tokenName], COLORS[tokenName])];
}

function setBoundStroke(node, variables, tokenName) {
  node.strokes = [boundPaint(variables[tokenName], COLORS[tokenName])];
}

function addAutoLayout(frame, direction, padding, gap) {
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = gap;
  frame.paddingTop = padding;
  frame.paddingRight = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
}

function textNode(name, characters, size, colorHex, bold = false) {
  const node = figma.createText();
  node.name = name;
  node.fontName = bold && canUseBoldFont ? FONT_BOLD : FONT_REGULAR;
  node.fontSize = size;
  node.fills = [{ type: "SOLID", color: hexToRgb(colorHex) }];
  node.characters = characters;
  return node;
}

function buttonComponent(name, label, variables, variant) {
  const component = figma.createComponent();
  component.name = name;
  component.resize(160, 44);
  component.cornerRadius = 12;
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisAlignItems = "CENTER";
  component.counterAxisAlignItems = "CENTER";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.paddingLeft = 18;
  component.paddingRight = 18;
  component.itemSpacing = 8;
  if (variant === "primary") {
    setBoundFill(component, variables, "color/brand/primary");
  } else {
    setBoundFill(component, variables, "color/surface/card");
    setBoundStroke(component, variables, "color/border/default");
    component.strokeWeight = 1;
  }
  const text = textNode("Label", label, 14, variant === "primary" ? "#FFFFFF" : COLORS["color/text/strong"], true);
  component.appendChild(text);
  return component;
}

function statusChipComponent(name, label, variables, tone) {
  const component = figma.createComponent();
  component.name = name;
  component.resize(124, 34);
  component.cornerRadius = 999;
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisAlignItems = "CENTER";
  component.counterAxisAlignItems = "CENTER";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.paddingLeft = 14;
  component.paddingRight = 14;
  setBoundFill(component, variables, tone === "success" ? "color/status/successSoft" : "color/status/warningSoft");
  const labelNode = textNode("Label", label, 13, tone === "success" ? "#047857" : "#B45309", true);
  component.appendChild(labelNode);
  return component;
}

function navItemComponent(name, label, variables, active) {
  const component = figma.createComponent();
  component.name = name;
  component.resize(240, 44);
  component.cornerRadius = 12;
  component.layoutMode = "HORIZONTAL";
  component.primaryAxisAlignItems = "MIN";
  component.counterAxisAlignItems = "CENTER";
  component.primaryAxisSizingMode = "FIXED";
  component.counterAxisSizingMode = "FIXED";
  component.paddingLeft = 12;
  component.paddingRight = 12;
  component.itemSpacing = 12;
  setBoundFill(component, variables, active ? "color/brand/primarySoft" : "color/surface/card");
  const icon = figma.createEllipse();
  icon.name = "Icon placeholder";
  icon.resize(24, 24);
  setBoundFill(icon, variables, active ? "color/brand/primary" : "color/border/default");
  component.appendChild(icon);
  component.appendChild(textNode("Label", label, 14, active ? COLORS["color/brand/primary"] : COLORS["color/text/muted"], true));
  return component;
}

function metricCard(name, title, value, variables) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(256, 116);
  frame.cornerRadius = 18;
  setBoundFill(frame, variables, "color/surface/card");
  setBoundStroke(frame, variables, "color/border/default");
  frame.strokeWeight = 1;
  addAutoLayout(frame, "VERTICAL", 18, 10);
  frame.appendChild(textNode("Title", title, 12, COLORS["color/text/muted"], true));
  frame.appendChild(textNode("Value", value, 28, COLORS["color/text/strong"], true));
  return frame;
}

function createDesktopFrame(variables, buttonPrimary, statusReady, navActive) {
  const frame = figma.createFrame();
  frame.name = `${PREFIX}Desktop / Fee Workbench Current`;
  frame.resize(1440, 960);
  frame.x = 3200;
  frame.y = 80;
  setBoundFill(frame, variables, "color/surface/canvas");

  const sidebar = figma.createFrame();
  sidebar.name = "Grouped navigation";
  sidebar.resize(280, 960);
  sidebar.x = 0;
  sidebar.y = 0;
  setBoundFill(sidebar, variables, "color/surface/card");
  sidebar.layoutMode = "VERTICAL";
  sidebar.paddingTop = 28;
  sidebar.paddingLeft = 20;
  sidebar.paddingRight = 20;
  sidebar.itemSpacing = 12;
  sidebar.appendChild(textNode("Brand", "EduManager", 20, COLORS["color/text/strong"], true));
  sidebar.appendChild(textNode("Group", "TAI CHINH", 11, COLORS["color/text/muted"], true));
  sidebar.appendChild(navActive.createInstance());
  frame.appendChild(sidebar);

  const content = figma.createFrame();
  content.name = "Fee workbench content";
  content.resize(1080, 820);
  content.x = 320;
  content.y = 80;
  content.cornerRadius = 28;
  setBoundFill(content, variables, "color/surface/card");
  addAutoLayout(content, "VERTICAL", 32, 24);
  content.appendChild(textNode("Eyebrow", "TAI CHINH - FEE WORKBENCH", 12, COLORS["color/brand/primary"], true));
  content.appendChild(textNode("Title", "Thu tien hoc phi", 34, COLORS["color/text/strong"], true));
  content.appendChild(textNode("Description", "Moi dong la mot hoc vien - mot lop - mot thang. Khong gop nhieu lop vao mot phieu thu.", 16, COLORS["color/text/muted"]));

  const metrics = figma.createFrame();
  metrics.name = "Metric row";
  metrics.layoutMode = "HORIZONTAL";
  metrics.itemSpacing = 16;
  metrics.primaryAxisSizingMode = "AUTO";
  metrics.counterAxisSizingMode = "AUTO";
  metrics.fills = [];
  metrics.appendChild(metricCard("Metric / Total", "Tong dong phi", "27", variables));
  metrics.appendChild(metricCard("Metric / Ready", "San sang thu", "16", variables));
  metrics.appendChild(metricCard("Metric / Paid", "Da thu", "11", variables));
  content.appendChild(metrics);

  const action = buttonPrimary.createInstance();
  action.name = "Primary action / Thu tien";
  content.appendChild(action);

  const status = statusReady.createInstance();
  status.name = "Status / San sang";
  content.appendChild(status);
  frame.appendChild(content);
  return frame;
}

function createMobileFrame(variables, buttonPrimary, statusReady) {
  const frame = figma.createFrame();
  frame.name = `${PREFIX}Mobile / Fee Workbench Current`;
  frame.resize(390, 844);
  frame.x = 4680;
  frame.y = 80;
  frame.cornerRadius = 32;
  setBoundFill(frame, variables, "color/surface/canvas");
  addAutoLayout(frame, "VERTICAL", 20, 16);
  frame.appendChild(textNode("Eyebrow", "TAI CHINH", 12, COLORS["color/brand/primary"], true));
  frame.appendChild(textNode("Title", "Thu tien hoc phi", 28, COLORS["color/text/strong"], true));
  frame.appendChild(textNode("Description", "Tach tung lop, thu nhanh, in phieu ngay.", 14, COLORS["color/text/muted"]));
  frame.appendChild(metricCard("Mobile Metric / Ready", "San sang thu", "16 dong", variables));
  frame.appendChild(buttonPrimary.createInstance());
  frame.appendChild(statusReady.createInstance());
  return frame;
}

async function main() {
  await figma.loadFontAsync(FONT_REGULAR);
  try {
    await figma.loadFontAsync(FONT_BOLD);
    canUseBoldFont = true;
  } catch (error) {
    canUseBoldFont = false;
  }

  const page = figma.currentPage;
  await page.loadAsync();
  const existingChildren = Array.prototype.slice.call(page.children);
  for (const child of existingChildren) {
    if (child.name.startsWith(PREFIX)) {
      child.remove();
    }
  }

  const collection = await getOrCreateCollection();
  const variables = {};
  for (const [name, hex] of Object.entries(COLORS)) {
    variables[name] = await getOrCreateColorVariable(collection, name, hex);
  }

  const primaryButton = buttonComponent(`${PREFIX}Button / variant=Primary`, "Thu tien", variables, "primary");
  primaryButton.x = 3200;
  primaryButton.y = -360;

  const secondaryButton = buttonComponent(`${PREFIX}Button / variant=Secondary`, "Xem chi tiet", variables, "secondary");
  secondaryButton.x = 3380;
  secondaryButton.y = -360;

  const statusReady = statusChipComponent(`${PREFIX}StatusChip / tone=Ready`, "San sang", variables, "warning");
  statusReady.x = 3200;
  statusReady.y = -290;

  const statusPaid = statusChipComponent(`${PREFIX}StatusChip / tone=Paid`, "Da thu", variables, "success");
  statusPaid.x = 3340;
  statusPaid.y = -290;

  const navActive = navItemComponent(`${PREFIX}NavItem / active=Finance`, "Thu tien", variables, true);
  navActive.x = 3200;
  navActive.y = -220;

  const desktop = createDesktopFrame(variables, primaryButton, statusReady, navActive);
  const mobile = createMobileFrame(variables, primaryButton, statusReady);

  const note = textNode(
    `${PREFIX}Implementation Note`,
    "Generated by EduFlow Source Of Truth Builder. Native variables are in collection EduFlow Production Tokens. Frames intentionally remove the old duplicate Thu hoc phi navigation.",
    14,
    COLORS["color/text/muted"]
  );
  note.x = 3200;
  note.y = 1080;
  note.resize(760, 60);
  page.appendChild(note);

  figma.viewport.scrollAndZoomIntoView([desktop, mobile, primaryButton, statusReady, navActive]);
  figma.notify("EduFlow native source-of-truth frames/components created.");
  figma.closePlugin("EduFlow native source-of-truth frames/components created.");
}

main().catch((error) => {
  figma.notify(`EduFlow builder failed: ${error.message}`);
  figma.closePlugin(`EduFlow builder failed: ${error.message}`);
});
