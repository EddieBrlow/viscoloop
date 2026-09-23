import { createLinkDirectoryRouter } from "../lib/linkDirectory.js";

const DATA_FILE = new URL("../../data/workguides.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const workGuidesRouter = createLinkDirectoryRouter(DATA_FILE, { nameField: "title", defaultIcon: "📋" });
