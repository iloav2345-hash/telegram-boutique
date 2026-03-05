const TelegramBot = require('node-telegram-bot-api');

// --- 1. TES INFORMATIONS (À REMPLIR) ---
const token = '8707103708:AAGz9OKli5HybsGLiSsANeSN3jmRaRWEHrM'; // Le token donné par BotFather
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = 'https://iloav2345-hash.github.io/telegram-boutique/'; // Le lien de ta page GitHub

// Création du bot
const bot = new TelegramBot(token, {polling: true});

// --- 2. COMMANDE /START ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // ✍️ TON MESSAGE PERSONNALISÉ EST ICI :
    // Utilise \n pour sauter une ligne, et les étoiles * pour mettre en gras
    const messageBienvenue = 
        "👋 *Bienvenue chez CapBdv !*\n\n" +
        "Découvrez nos produits *exclusif* en direct. 🍫❄️\n" +
        "Livraison *rapide* et *discrète* garanties 🤝\n\n" +
        "La mini app gère tout, choissez vos produits et validez le panier ✅\n\n" +
        "On vous envoie un message pour vous indiquez l'heure et quand la commande est prête !📦\n\n" +
        "👇 *Cliquez sur le bouton ci-dessous pour ouvrir le menu :*";

    bot.sendMessage(chatId, messageBienvenue, {
        parse_mode: 'Markdown', // On active le Markdown pour que les * fassent du gras
        reply_markup: {
            keyboard: [
                // Tu peux aussi changer le texte du bouton ici si tu veux !
                [{text: "Ouvrir la Boutique 🛍️", web_app: {url: webAppUrl}}]
            ],
            resize_keyboard: true
        }
    });
});

// --- 3. RÉCEPTION DE LA COMMANDE ---
bot.on('message', async (msg) => {
    if (msg.web_app_data?.data) {
        try {
            const data = JSON.parse(msg.web_app_data.data);
            const chatId = msg.chat.id; 
            
            const articles = data.articles; 
            const infosClient = data.infosClient; 
            const methodePaiement = data.methodePaiement; 
            
            let listeArticles = "";
            let total = 0;

            articles.forEach(item => {
                listeArticles += `- ${item.name} (x1) : ${item.price}€\n`;
                total += item.price;
            });

            let texteInfo = infosClient ? infosClient : "Non renseignée";

            // --- NOUVEAU : INSTRUCTIONS DE PAIEMENT SUR MESURE ---
            let instructionsPaiement = "";

            if (methodePaiement === "Crypto") {
                // Le petit apostrophe inversé (`) permet au client de copier l'adresse en 1 clic sur Telegram !
                instructionsPaiement = "🪙 *Instructions pour la Crypto :*\n" +
                                       "Veuillez envoyer le montant exact (USDT/BTC) à cette adresse :\n" +
                                       "`Bientot`\n\n" +
                                       "Une fois le transfert effectué, envoyez-moi une capture d'écran à @SouPoudreuz.";
            
            } else if (methodePaiement === "Carte Bancaire") {
                instructionsPaiement = "💳 *Instructions pour la Carte Bancaire :*\n" +
                                       "Veuillez vous rendre sur notre site partenaire pour régler : [Lien du site](https://www.bitpay.com/buy-crypto)\n\n" +
                                       "*Comment faire ?*\n" +
                                       "1. Allez sur le site.\n" +
                                       "2. Ecrivez un montant de " + total + "€.\n" +
                                       "3. Payez par CB et choissisez l'option simplex après avoir cliquez sur choisir l'offre.";
            
            } else {
                instructionsPaiement = "💵 *Instructions pour les Espèces :*\n" +
                                       "Merci de préparer l'appoint si possible lors de la livraison.";
            }
            // -----------------------------------------------------

            // 1. Le message POUR LE CLIENT
            let messageAcheteur = `📝 *Résumé de votre commande :*\n\n${listeArticles}\n*Total : ${total}€*\n\n📍 *Adresse :* ${texteInfo}\n💳 *Paiement choisi :* ${methodePaiement}\n\n${instructionsPaiement}\n\nJe vous contacte très vite pour finaliser !`;
            await bot.sendMessage(chatId, messageAcheteur, {parse_mode: 'Markdown'});

            // 2. Le message POUR TOI (Le Vendeur)
            let pseudoClient = msg.from.username ? `@${msg.from.username}` : "Pas de pseudo";
            
            let messagePourMoi = `🚨 NOUVELLE COMMANDE !\n\n` +
                                 `👤 Client : ${pseudoClient}\n` +
                                 `📍 Adresse : ${texteInfo}\n` +
                                 `💳 Paiement : ${methodePaiement}\n` +
                                 `🆔 ID : ${chatId}\n\n` +
                                 `🛒 PANIER :\n${listeArticles}\n` +
                                 `💰 TOTAL : ${total}€`;
            
            await bot.sendMessage(monIdAdmin, messagePourMoi);
            
        } catch (e) {
            console.error("Erreur de traitement :", e);
        }
    }
});


console.log("✅ Le bot est lancé en local sur ton PC !");
