import { createLinkDirectoryRouter } from "../lib/linkDirectory.js";

const DATA_FILE = new URL("../../data/hr.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const hrRouter = createLinkDirectoryRouter(DATA_FILE, { nameField: "title", defaultIcon: "🧑‍💼" });
