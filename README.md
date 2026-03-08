# 📱 Z-Phone (Advanced QBCore Phone)

![FiveM](https://img.shields.io/badge/FiveM-F4A90A?style=for-the-badge&logo=fivem&logoColor=white)
![QBCore](https://img.shields.io/badge/QBCore-Framework-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/UI-HTML%20%7C%20CSS%20%7C%20JS-E34F26?style=for-the-badge)

**Z-Phone** is a highly customized, fully redesigned smartphone resource for the QBCore Framework. Built from the ground up to replace the clunky, outdated interfaces of older phone scripts, Z-Phone introduces a modern, dark-mode, frosted-glass aesthetic designed for high-tier roleplay servers and content creators.

---

## 📸 Screenshots

### Home & Navigation
| Home Page | App Drawer | Calculator | Maps |
|:---:|:---:|:---:|:---:|
| <img src="https://i.vgy.me/nOo5iG.png" width="200"> | <img src="https://i.vgy.me/8ms9OA.png" width="200"><br><img src="https://i.vgy.me/kERWZE.png" width="200"> | <img src="https://i.vgy.me/toFBrv.png" width="200"> | <img src="https://i.vgy.me/dD3c3s.png" width="200"> |

### Party Application
| Active Party | Tasks | Jobs | Details |
|:---:|:---:|:---:|:---:|
| <img src="https://i.vgy.me/9kYVlp.png" width="200"> | <img src="https://i.vgy.me/RtGjHJ.png" width="200"> | <img src="https://i.vgy.me/XRPi6m.png" width="200"> | <img src="https://i.vgy.me/4VEopW.png" width="200"> |

### Pulses (Social Media) & Mail
| Feed | Profile | Mail Inbox | Reading Mail |
|:---:|:---:|:---:|:---:|
| <img src="https://i.vgy.me/GZlqJN.png" width="200"> | <img src="https://i.vgy.me/QWVepp.png" width="200"><br><img src="https://i.vgy.me/x9Ugqt.png" width="200"> | <img src="https://i.vgy.me/6aCRkI.png" width="200"><br><img src="https://i.vgy.me/E9nqlt.png" width="200"> | <img src="https://i.vgy.me/ZqhWBa.png" width="200"> |

### Proxi (Marketplace) & Settings
| Proxi Market | Item Details | Settings 1 | Settings 2 |
|:---:|:---:|:---:|:---:|
| <img src="https://i.vgy.me/mjeHXC.png" width="200"> | <img src="https://i.vgy.me/SSSdrc.png" width="200"> | <img src="https://i.vgy.me/vsBDR9.png" width="200"><br><img src="https://i.vgy.me/avIAth.png" width="200"> | <img src="https://i.vgy.me/S2Rnoz.png" width="200"><br><img src="https://i.vgy.me/szyye4.png" width="200"> |

---

## ✨ What Makes Z-Phone Different?

While standard `qb-phone` and `qb-phone-renewed` provide great functional bases, they often lack the premium, cohesive UI expected in modern FiveM servers. Z-Phone was built to bridge that gap. 

**Key Improvements & Differences:**
* **"Zero Sharp Edges" Aesthetic:** A completely overhauled HTML/CSS frontend featuring matte dark tones, glowing neon accents, and frosted-glass depth effects. 
* **Streamlined Codebase:** Removed unnecessary bloat. Unused or highly-specific apps (like Documents, Crypto, and Houses) have been separated into a `Not-used` archive.
* **Redesigned App Ecosystem:** Every core app has been visually unified so the phone feels like a single operating system, not a collection of random scripts.
* **Custom SVGs & Icons:** Replaced pixelated image icons with crisp, scalable SVGs for flawless rendering on any monitor resolution.
* **Content-Creator Friendly:** Designed specifically with streamers in mind, ensuring the UI looks incredible on video and live streams without obstructing gameplay.

## 📱 Included Applications

* **Core:** Messages, Dialer, Contacts, Settings, Camera, Gallery.
* **Services:** Bank, Mail, Proxi (Yellow Pages/Marketplace), Garage (Track & Manage Vehicles), Services directory.
* **Social:** Pulses (Social Media platform), Party (Group Management), Ping (Location Sharing).

## 🧪 Local Browser Dev Preview

You can now preview the phone UI in a normal browser without joining your FiveM server first.

### How it works

- When `html/index.html` is opened from `localhost`, `127.0.0.1`, `file://`, or with `?dev=1`, the frontend enables a **browser-only dev mode**.
- Dev mode stubs the NUI requests and loads **mock contacts, chats, mail, pulses, invoices, garage vehicles, services staff, and gallery data** from local browser storage.
- Changes you make in the UI are persisted in `localStorage` until you press **Reset data** in the dev badge.

### Recommended usage

Run a simple local server from the repository root:

```bash
cd /path/to/z-phone
python3 -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/html/index.html?dev=1
```

### Dev preview helpers

- **Reload** button: replays the mock phone boot payload without refreshing the whole page
- **Reset data** button: clears the saved mock state and restores the default preview dataset
- Browser console: `window.ZPhoneDev.boot()`, `window.ZPhoneDev.reset()`, `window.ZPhoneDev.getState()`

## 🌿 Also Currently Working On...

I am actively expanding Z-Phone's capabilities and developing companion scripts. **Coming soon:**
* **New Phone Apps:** Phone Dialer overhaul, Garage updates, dark-themed Messages, and Darkchat.
* **Advanced Weed Script & Underground Marketplace:** Pushing criminal RP to the next level by introducing a fully functional digital marketplace for buying/selling product.
* **Player-Owned Strain Stats:** Players will be able to cultivate, cross-breed, and name their own unique strains, complete with dynamic stats, varying potencies, and custom effects. 

## 🤝 Inspirations & Credits

This project would not be possible without the incredible foundation built by the FiveM open-source community. 
* **QBCore Team:** For the original `qb-phone` logic and database structure.
* **Renewed Scripts (`qb-phone-renewed`):** For paving the way in optimizing phone callbacks and NUI logic. 
* **Community Developers:** Inspiration for the UI/UX was drawn from various premium iOS/Android concepts and modern gaming interfaces. 

## ⚖️ License & Usage Rights

**Please read carefully before downloading or using this resource.**

1. **Free to Use:** You are completely free to use Z-Phone on your FiveM server. 
2. **Modification:** You may edit, modify, and tweak the HTML/CSS/Lua files to fit the specific needs of your community.
---

### 📫 Connect With Me
*Built with 💻 and ☕ for the FiveM Community.*
* 📺 **YouTube:** [Check out my dev streams & RP content](https://www.youtube.com/@Zemoadityatomar)
* 💬 **Discord:** Add me at `zemo4994` or [Join my Server](https://discord.gg/ekYJeWB)
