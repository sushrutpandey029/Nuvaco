import fs from "fs";
import path from "path";
import handlebars from "handlebars";
// import { transporter } from "./transporter.js";
// import { mailConfig } from "../../config/mail.config.js";
import { mailConfig } from "../../config/mail.config.js";
import { transporter } from "./transporter.js";

const __dirname = path.resolve();

export const sendMail = async ({
  to,
  subject,
  template,
  context = {},
  attachments = [],
}) => {
  try {
    const templatePath = path.join(
      __dirname,
      "templates",
      "emails",
      `${template}.hbs`
    );

    const layoutPath = path.join(
      __dirname,
      "templates",
      "emails",
      "layouts",
      "main.hbs"
    );

    const templateSource = fs.readFileSync(templatePath, "utf-8");
    const layoutSource = fs.readFileSync(layoutPath, "utf-8");

    const compiledTemplate = handlebars.compile(templateSource);
    const compiledLayout = handlebars.compile(layoutSource);

    const body = compiledTemplate(context);

    const html = compiledLayout({
      subject,
      body,
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: mailConfig.from,
      to,
      subject,
      html,
      attachments,
    });

    console.log(`📧 Mail sent to ${to} | ${subject}`);
  } catch (error) {
    console.error("❌ Mail send failed:", error.message);
    throw error;
  }
};
