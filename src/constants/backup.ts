/**
 * Backup folder structure:
 *   {documentDirectory}/Backups/DataGuard/
 *     backups/
 *       {YYYY-MM-DD_HH-mm-ss}/
 *         manifest.json
 *         contacts.json
 *         messages.json
 *         callLogs.json
 *
 * Public Android export structure:
 *   Download/Data Guard/
 *     Contacts/
 *       contacts_{YYYY-MM-DD_HH-mm-ss}.vcf
 *     SMS/
 *       sms_{YYYY-MM-DD_HH-mm-ss}.json
 *     Calls/
 *       calls_{YYYY-MM-DD_HH-mm-ss}.json
 */

export const BACKUP_FOLDER_NAME = "DataGuard";
export const BACKUPS_SUBFOLDER = "backups";
export const MANIFEST_FILE = "manifest.json";
export const CONTACTS_FILE = "contacts.json";
export const MESSAGES_FILE = "messages.json";
export const CALL_LOGS_FILE = "callLogs.json";

export const PUBLIC_BACKUP_ROOT_FOLDER = "Data Guard";
export const PUBLIC_CONTACTS_FOLDER = "Contacts";
export const PUBLIC_SMS_FOLDER = "SMS";
export const PUBLIC_CALLS_FOLDER = "Calls";
