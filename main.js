const fs = require('fs');
const readline = require('readline');
const { SingleBar } = require('cli-progress');
const path = require('path');

// Créer un objet utilisateur pour stocker les informations d'identification
const utilisateur = {
    nomUtilisateur: 'admin',
    motDePasse: 'password'
};

// Fonction pour effacer la console
function effacerConsole() {
    console.clear();
}

// Fonction pour authentifier l'utilisateur
function authentifierUtilisateur() {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Nom d\'utilisateur : ', (nomUtilisateur) => {
            rl.question('Mot de passe : ', (motDePasse) => {
                if (nomUtilisateur === utilisateur.nomUtilisateur && motDePasse === utilisateur.motDePasse) {
                    rl.close();
                    setTimeout(effacerConsole, 2000); // Effacer la console après 2 secondes
                    setTimeout(resolve, 2000); // Attendre 2 secondes avant de résoudre la promesse
                    console.log('Patience...');
                } else {
                    console.log('Nom d\'utilisateur ou mot de passe incorrect.');
                    rl.close();
                    reject();
                }
            });
        });
    });
}

// Fonction pour mettre à jour le titre de la console avec un effet de mouvement
function mettreAJourTitre() {
    let frame = 0;
    const frames = ['▲', '▶', '▼', '◀']; // Pour un triangle
    const intervalID = setInterval(() => {
        process.title = frames[frame];
        frame = (frame + 1) % frames.length;
    }, 200); // Mettre à jour toutes les 200 millisecondes

    return intervalID;
}

// Fonction pour arrêter la mise à jour du titre de la console
function arreterMiseAJourTitre(intervalID) {
    clearInterval(intervalID);
}

// Fonction pour chercher le nom dans un fichier
function chercherNomDansFichier(nomRecherche, fichier) {
    return new Promise((resolve, reject) => {
        let occurences = 0; // Pour compter le nombre d'occurrences trouvées
        let resultats = []; // Pour stocker les résultats

        // Créer une interface de lecture pour lire le fichier ligne par ligne
        const lectureInterface = readline.createInterface({
            input: fs.createReadStream(fichier),
            output: process.stdout,
            terminal: false
        });

        // Fonction pour traiter chaque ligne lue
        lectureInterface.on('line', (ligne) => {
            // Si la ligne contient le nom recherché (en ignorant la casse), l'ajouter aux résultats
            if (ligne.toLowerCase().includes(nomRecherche.toLowerCase())) {
                occurences++; // Incrémenter le nombre d'occurrences trouvées
                resultats.push({ ligne: ligne }); // Ajouter la ligne au résultat
            }
        });

        // Gérer la fin de la lecture du fichier
        lectureInterface.on('close', () => {
            resolve({ occurences: occurences, resultats: resultats });
        });
    });
}

// Fonction pour chercher le nom dans tous les fichiers d'un répertoire
async function chercherNomDansRepertoire(nomRecherche, repertoire, bar) {
    // Récupérer tous les fichiers du répertoire et de ses sous-répertoires
    const fichiers = getAllFiles(repertoire);

    // Filtrer les fichiers pour ne conserver que les fichiers TXT
    const fichiersTXT = fichiers.filter(file => path.extname(file) === '.txt');

    let resultatsGlobaux = [];

    // Parcourir tous les fichiers TXT et chercher le nom dans chaque fichier
    for (const fichier of fichiersTXT) {
        const { occurences, resultats } = await chercherNomDansFichier(nomRecherche, fichier);
        if (occurences > 0) {
            resultatsGlobaux.push({ fichier: fichier, occurences: occurences, resultats: resultats });
        }
        bar.increment(); // Mettre à jour la barre de progression pour chaque fichier traité
    }

    return resultatsGlobaux;
}

// Fonction récursive pour récupérer tous les fichiers d'un répertoire et de ses sous-répertoires
function getAllFiles(dirPath, fichiers = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            fichiers = getAllFiles(filePath, fichiers);
        } else {
            fichiers.push(filePath);
        }
    });
    return fichiers;
}

// Fonction pour enregistrer les résultats dans un fichier
function enregistrerResultats(resultats, nomFichierSortie) {
    // Créer le dossier "output" s'il n'existe pas
    const dossierOutput = 'output';
    if (!fs.existsSync(dossierOutput)) {
        fs.mkdirSync(dossierOutput);
    }

    const fichierSortie = path.join(dossierOutput, nomFichierSortie);
    fs.writeFileSync(fichierSortie, JSON.stringify(resultats, null, 2));
    console.log(`\nLes résultats ont été enregistrés dans le fichier ${fichierSortie}.`);
}

// Authentifier l'utilisateur avant de commencer la recherche
authentifierUtilisateur()
    .then(() => {
        const intervalID = mettreAJourTitre(); // Démarre la mise à jour du titre de la console
        // Demander le nom à rechercher, le chemin du répertoire et l'extension du fichier de sortie à l'utilisateur
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Entrez le nom à rechercher : ', async (nom) => {
            rl.question('Entrez le chemin du répertoire où effectuer la recherche : ', async (repertoire) => {
                rl.question('Entrez l\'extension du fichier de sortie (sql, csv, txt, json) : ', async (extension) => {
                    arreterMiseAJourTitre(intervalID); // Arrête la mise à jour du titre de la console
                    console.log("\nRecherche en cours...");
                    const fichiers = getAllFiles(repertoire);
                    const fichiersTXT = fichiers.filter(file => path.extname(file) === '.txt');
                    const bar = new SingleBar({
                        format: '{bar} {percentage}% | {value}/{total} fichiers | Recherche en cours...'
                    });
                    bar.start(fichiersTXT.length, 0); // Démarrer la barre de progression avec le nombre total de fichiers
                    const resultats = await chercherNomDansRepertoire(nom, repertoire, bar);
                    bar.stop(); // Arrêter la barre de progression une fois la recherche terminée

                    if (resultats.length === 0) {
                        console.log("Aucun résultat trouvé.");
                    } else {
                        switch (extension.toLowerCase()) {
                            case 'sql':
                                enregistrerResultats(resultats, `results_${getDateAujourdhui()}_${getTimeAujourdhui()}.sql`);
                                break;
                            case 'csv':
                                enregistrerResultats(resultats, `results_${getDateAujourdhui()}_${getTimeAujourdhui()}.csv`);
                                break;
                            case 'txt':
                                enregistrerResultats(resultats, `results_${getDateAujourdhui()}_${getTimeAujourdhui()}.txt`);
                                break;
                            case 'json':
                                enregistrerResultats(resultats, `results_${getDateAujourdhui()}_${getTimeAujourdhui()}.json`);
                                break;
                            default:
                                console.log("Extension de fichier non valide. Les résultats seront enregistrés au format JSON.");
                                enregistrerResultats(resultats, `results_${getDateAujourdhui()}_${getTimeAujourdhui()}.json`);
                                break;
                        }
                    }
                    rl.close();
                });
            });
        });
    })
    .catch((erreur) => {
        console.log("Erreur d'authentification :", erreur);
    });

// Fonction pour obtenir la date d'aujourd'hui au format JJ/MM/AAAA
function getDateAujourdhui() {
    const maintenant = new Date();
    const jour = maintenant.getDate().toString().padStart(2, '0');
    const mois = (maintenant.getMonth() + 1).toString().padStart(2, '0');
    const annee = maintenant.getFullYear();
    return `${jour}-${mois}-${annee}`;
}

// Fonction pour obtenir l'heure d'aujourd'hui au format HH:MM
function getTimeAujourdhui() {
    const maintenant = new Date();
    const heures = maintenant.getHours().toString().padStart(2, '0');
    const minutes = maintenant.getMinutes().toString().padStart(2, '0');
    return `${heures}H${minutes}`;
}
