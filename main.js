const fs = require('fs');
const readline = require('readline');
const { SingleBar } = require('cli-progress');

// Fonction pour chercher le nom dans la base de données
function chercherNom(nomRecherche, callback) {
    const cheminFichier = 'db/names.txt'; // Remplacez par votre chemin

    let occurences = 0; // Pour compter le nombre d'occurrences trouvées

    let totalLines = 0; // Nombre total de lignes dans le fichier
    let currentLine = 0; // Numéro de la ligne actuelle

    // Créer une barre de progression
    const barreProgression = new SingleBar({
        format: '{bar} {percentage}% | {value}/{total} lignes | Recherche en cours...'
    }, {
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    // Obtenir le nombre total de lignes dans le fichier
    fs.readFileSync(cheminFichier).toString().split('\n').forEach((line) => {
        totalLines++;
    });

    // Afficher la barre de progression
    barreProgression.start(totalLines, 0);

    // Créer une interface de lecture pour lire le fichier ligne par ligne
    const lectureInterface = readline.createInterface({
        input: fs.createReadStream(cheminFichier),
        output: process.stdout,
        terminal: false
    });

    // Fonction pour traiter chaque ligne lue
    lectureInterface.on('line', (ligne) => {
        currentLine++;
        // Mise à jour de la barre de progression
        barreProgression.update(currentLine);
        
        // Si la ligne contient le nom recherché, l'afficher
        if (ligne.includes(nomRecherche)) {
            occurences++; // Incrémenter le nombre d'occurrences trouvées
        }
    });

    // Gérer la fin de la lecture du fichier
    lectureInterface.on('close', () => {
        // Terminer la barre de progression
        barreProgression.stop();

        // Si le nom a été trouvé au moins une fois, afficher le nombre total d'occurrences
        if (occurences > 0) {
            const plural = occurences > 1 ? 's' : ''; // Pluriel si plus d'une occurrence
            console.log(`\nLe nom "${nomRecherche}" a été trouvé ${occurences} fois.`);
        } else {
            callback(new Error('Nom non trouvé dans la base de données'), null);
        }
    });
}

// Demander le nom à rechercher à l'utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Entrez le nom à rechercher dans la base de données : ', (nom) => {
    console.log(""); // Ajout d'une ligne vide pour l'esthétique
    chercherNom(nom, (erreur, resultat) => {
        if (erreur) {
            console.error(erreur.message);
        } else {
            console.log(`\nLe nom "${nom}" a été trouvé.`);
        }
        rl.close();
    });
});
