// Génère la ligne ADMIN_PASSWORD_HASH à coller dans le .env du serveur.
// Usage : npm run admin:password        (le mot de passe est demandé, rien n'est affiché)
//         npm run admin:password -- --stdin   (lu sur l'entrée standard)
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline';

async function ask() {
  if (process.argv.includes('--stdin')) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, '');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const write = rl._writeToOutput?.bind(rl);
  rl._writeToOutput = (s) => (s.includes('Mot de passe') ? write?.(s) : write?.('*'));
  const pw = await new Promise((resolve) => rl.question('Mot de passe admin : ', resolve));
  rl.close();
  process.stdout.write('\n');
  return pw;
}

const password = await ask();
if (password.length < 12) {
  console.error('Choisis au moins 12 caractères (une phrase de passe, c’est parfait).');
  process.exit(1);
}
// $2b$ et $2y$ sont le même algorithme ; PHP préfère l'écriture $2y$.
const hash = bcrypt.hashSync(password, 12).replace(/^\$2[ab]\$/, '$2y$');
console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
