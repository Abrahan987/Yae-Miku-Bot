<div align="center">
  <img src="https://qu.ax/FdqjE.jpg" width="420" alt="Yae Miku Bot banner" />
  <h1>🌸 Yae Miku Bot</h1>
  <p><strong>Un bot de WhatsApp con estilo, energía y personalidad</strong></p>

  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="WhatsApp" src="https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
  <img alt="Baileys" src="https://img.shields.io/badge/Baileys-WhatsApp%20SDK-2DDE98?style=for-the-badge" />

  <br /><br />
</div>

> “Yae Miku Bot” no es solo un bot: es una vibra, una energía, y una forma de hacer tu comunidad más divertida, ordenada y divertida a la vez.

---

## ✨ ¿Qué hace este bot?

Yae Miku Bot está pensado para funcionar como bot de WhatsApp con una base sólida, modular y personalizable. Entre sus capacidades se destacan:

- Conexión con WhatsApp usando Baileys
- Login por QR o por código de vinculación
- Estructura modular para comandos y handlers
- Soporte para plugins / carga automática de archivos
- Personalización del bot con nombre, prefijos, banner e icono
- Base lista para extender con funciones, utilidades, moderación y automations

---

## 🩷 Características principales

- 🔥 Bot listo para arrancar con `npm start`
- ⚙️ Configuración centralizada en `config.ts`
- 💡 Estructura organizada y fácil de extender
- 🧩 Carga dinámica de plugins para facilitar desarrollo
- 🛡️ Manejo de reconexión y sesiones de WhatsApp
- 🎨 Diseño visual con identidad "Yae Miku" y estilo anime / kawaii

---

## 🧰 Stack tecnológico

Este proyecto usa principalmente:

- Node.js
- TypeScript
- Baileys (cliente de WhatsApp)
- Pino para logs
- Express y librerías auxiliares para utilidades, scrapers y manejo de archivos

---

## 🚀 Instalación rápida

### Requisitos

- Node.js >= 22.5.0
- npm o yarn
- Acceso a WhatsApp para vincular el bot

### 1) Clonar el repositorio

```bash
git clone https://github.com/Abrahan987/Yae-Miku-Bot.git
cd Yae-Miku-Bot
```

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar el bot

Edita el archivo `config.ts` y ajusta los valores principales:

```ts
global.owner = '573237649689';
global.namebot = '𖫨𖫨🪷⃨᪲  𝐘𝐀𝐄 𝐌𝐈𝐊𝐔 𝗕𝗢𝗧˙ᰨᰍ';
global.prefix = ['.', '#'];
global.banner = 'https://...';
global.icono = 'https://...';
```

> Puedes cambiar el nombre, prefijo, banners y datos según quieras darle tu identidad personal al bot.

### 4) Ejecutarlo

Modo desarrollo:

```bash
npm run dev
```

Modo producción:

```bash
npm start
```

---

## 🧠 Estructura del proyecto

```text
Yae-Miku-Bot/
├── config.ts
├── index.ts
├── handler.ts
├── package.json
├── src/
│   ├── lib/
│   ├── plugins/
│   └── ...
├── sessions/
├── README.md
└── LICENSE
```

- `index.ts`: inicia el bot
- `handler.ts`: maneja eventos y lógica principal
- `config.ts`: configuración global
- `src/`: módulos y utilidades del bot
- `sessions/`: almacenamiento de sesión de WhatsApp

---

## 🧪 Uso básico

El bot viene con prefijos configurados por defecto:

```text
. comando
# comando
```

Puedes personalizar el prefijo editando esta línea en `config.ts`:

```ts
global.prefix = ['.', '#'];
```

---

## 🛡️ Recomendaciones importantes

- No compartas tokens, credenciales ni sesiones públicas.
- Mantén la carpeta `sessions/` protegida.
- Si editas configuraciones sensibles, asegúrate de no subir datos privados a GitHub.
- Si despliegas el bot en un servidor, usa variables o archivos de entorno según tu entorno de producción.

---


---

## 👑 Créditos

- Proyecto desarrollado por: Abrahan987
- Contribuciones y apoyo: Ryuzei-Ts
- Estilo y branding: Yae Miku Bot

---

## 📜 Licencia

Este proyecto está bajo la licencia que se encuentra en el archivo `LICENSE` del repositorio.

---

<div align="center">
  <h3>💖 Gracias por usar Yae Miku Bot</h3>
  <p>Si este proyecto te gusta, dale una estrella ⭐ y ayuda a que siga creciendo.</p>
  <p><em>Hecho con amor, energía y estilo anime ✨</em></p>
</div>

---

<p align="center">
  <a href="https://github.com/Abrahan987">@Abrahan987</a>
</p>
