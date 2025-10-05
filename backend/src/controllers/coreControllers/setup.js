require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { globSync } = require('glob');
const fs = require('fs');
const { generate: uniqueId } = require('shortid');

const mongoose = require('mongoose');

const setup = async (req, res) => {
  const Admin = mongoose.model('Admin');
  const AdminPassword = mongoose.model('AdminPassword');
  const Setting = mongoose.model('Setting');

  const PaymentMode = mongoose.model('PaymentMode');
  const Taxes = mongoose.model('Taxes');

  const newAdminPassword = new AdminPassword();

  const { name, email, password, language, timezone, country, config = {} } = req.body;

    const objectSchema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string()
        .email({ tlds: { allow: true } })
        .required(),
      password: Joi.string().required(),
    });

    const { error, value } = objectSchema.validate({ name, email, password });
    if (error) {
      return res.status(409).json({
        success: false,
        result: null,
        error: error,
        message: 'Invalid/Missing credentials.',
        errorMessage: error.message,
      });
    }

    const salt = uniqueId();

    const passwordHash = newAdminPassword.generateHash(salt, password);

    const accountOwnner = {
      email,
      name,
      role: 'owner',
    };
    const result = await new Admin(accountOwnner).save();

    const AdminPasswordData = {
      password: passwordHash,
      emailVerified: true,
      salt: salt,
      user: result._id,
    };
    await new AdminPassword(AdminPasswordData).save();

    const settingData = [];
    const settingsFiles = globSync('./src/setup/defaultSettings/**/*.json');

    // Limit the number of files to prevent resource exhaustion
    if (settingsFiles.length > 100) {
      throw new Error('Too many settings files detected, possible security issue');
    }

    // Use async file operations and Promise.all for better performance and resource management
    const filePromises = settingsFiles.map(async (filePath) => {
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');

        // Limit file size to prevent memory exhaustion
        if (fileContent.length > 1024 * 1024) {
          // 1MB limit
          throw new Error(`Settings file too large: ${filePath}`);
        }

        return JSON.parse(fileContent);
      } catch (error) {
        console.error(`Error reading settings file ${filePath}:`, error);
        throw new Error(`Invalid settings file: ${filePath}`);
      }
    });

    const files = await Promise.all(filePromises);

    const settingsToUpdate = {
      idurar_app_email: email,
      idurar_app_company_email: email,
      idurar_app_timezone: timezone,
      idurar_app_country: country,
      idurar_app_language: language || 'en_us',
    };

    const newSettings = file.map((x) => {
      const settingValue = settingsToUpdate[x.settingKey];
      return settingValue ? { ...x, settingValue } : { ...x };
    });

    await Setting.insertMany(settingData);

    await Taxes.insertMany([{ taxName: 'Tax 0%', taxValue: '0', isDefault: true }]);

    await PaymentMode.insertMany([
      {
        name: 'Default Payment',
        description: 'Default Payment Mode (Cash , Wire Transfert)',
        isDefault: true,
      },
    ]);

  return res.status(200).json({
    success: true,
    result: {},
    message: 'Successfully IDURAR App Setup',
  });
};

module.exports = setup;
