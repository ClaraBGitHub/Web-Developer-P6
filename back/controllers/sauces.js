const Sauce = require('../models/sauce');
const fs = require('fs');
const { runInNewContext } = require('vm');
const sauce = require('../models/sauce');

exports.createSauce = (req, res, next) => {
    const sauceObject = JSON.parse(req.body.sauce); // Pour ajouter un fichier à la requête, le front-end doit envoyer les données de la requête sous la forme form-data, et non sous forme de JSON. Le corps de la requête contient une chaîne sauce , qui est simplement un objet Sauce converti en chaîne. Nous devons donc l'analyser à l'aide de JSON.parse() pour obtenir un objet utilisable.
    delete sauceObject._id; // On supprime le champ _id qui est généré automatiquement par la BDD (car ce ne sera pas le bon id)
    const sauce = new Sauce ({ // Création d'une instance de sauce
        ...sauceObject,  // L'operateur spread "...", permet de copier les éléments du body
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}` // Nous devons également résoudre l'URL complète de notre image, car req.file.filename ne contient que le segment filename . Nous utilisons req.protocol pour obtenir le premier segment (dans notre cas 'http' ). Nous ajoutons '://' , puis utilisons req.get('host') pour résoudre l'hôte du serveur (ici, 'localhost:3000' ). Nous ajoutons finalement '/images/' et le nom de fichier pour compléter notre URL.
    });
    sauce.save() // Enregistre les infos dans la BDD
    .then(()=> res.status(201).json({ message : 'Sauce bien enregistrée'}))
    .catch(error => {
        res.status(400).json({ error : error })});
};

exports.modifySauce = (req, res, next) => {
    const sauceObject = req.file ? // Dans cette version modifiée de la fonction, on crée un objet sauceObject qui regarde si req.file existe ou non. S'il existe, on traite la nouvelle image ; s'il n'existe pas, on traite simplement l'objet entrant. On crée ensuite une instance sauce à partir de sauceObject , puis on effectue la modification.
    {
        ...JSON.parse(req.body.sauce), // JSON.parse() transforme un objet stringifié en Object JavaScript exploitable.
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    }   : {...req.body};
    Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
    .then(() => res.status(200).json({ message: 'Sauce updated successfully!'}))
    .catch(error => res.status(400).json({ error: error }));
};

exports.deleteSauce = (req, res, next) => {
    Sauce.findOne({ _id: req.params.id }) // On trouve l'objet dans la BDD
    .then(sauce => {
        if (!sauce) {
            res.status(404).json({ error: new Error('No such Thing!') });
        }
        if (sauce.userId !== req.auth.userId) {
            res.status(400).json({ error: new Error('Unauthorized request!') });
        } 
      const filename = sauce.imageUrl.split('/images/')[1]; // Une fois trouvé, on extrait le nom du fichier à supprimer
      fs.unlink(`images/${filename}`, () => { // On le supprime avec fs.unlink
        Sauce.deleteOne({ _id: req.params.id })
            .then(() => res.status(204).json({ message: 'Objet supprimé !'}))
            .catch(error => res.status(400).json({ error }));
            });
        })
    .catch(error => res.status(400).json({ error }));
};

exports.getOneSauce = (req, res, next ) => {
    Sauce.findOne({ _id: req.params.id }) // La méthode findOne() dans notre modèle sauce pour trouver la sauce unique ayant le même _id que le paramètre de la requête
    .then(sauce => res.status(200).json(sauce))
    .catch(error => res.status(404).json({ error }));
};

exports.getAllSauce = (req, res, next) => {
    Sauce.find()
    .then(sauces => {
        return res.status(200).json( sauces );
    })
    .catch(error => res.status(404).json({ error : error }))
};


exports.getLikes = (req, res, next) =>  {
    sauce.findOne({ _id: req.params.id })
    .then(sauce => {
        // Like for the first time
        if (!sauce.usersLiked.includes(req.body.userId) && req.body.like === 1) { // includes() method : check if something is in an array
            sauce.likes += 1;
            sauce.usersLiked.push(req.body.userId);
        // Cancel like
        } else if (sauce.usersLiked.includes(req.body.userId) && req.body.like === 0) {
            sauce.likes -= 1;
            let userKey = sauce.usersLiked.indexOf(req.body.userId)
            sauce.usersLiked.splice(userKey, 1);
        // Dislike for the first time
        } else if (!sauce.usersDisliked.includes(req.body.userId) && req.body.like === -1) {
            sauce.dislikes += 1;
            sauce.usersDisliked.push(req.body.userId);
        // Cancel dislike
        } else if (sauce.usersDisliked.includes(req.body.userId) && req.body.like === 0) {
            sauce.dislikes -= 1 ;
            let userKey = sauce.usersDisliked.indexOf(req.body.userId) // We are getting the index of the element we are currently on.
            sauce.usersDisliked.splice(userKey, 1); // spilce() method change an array content by delete or add elements. Here we are deleting the first element start from "userKey"
        }
        Sauce.updateOne({ _id: req.params.id }, { likes: sauce.likes, usersLiked: sauce.usersLiked, dislikes: sauce.dislikes, usersDisliked: sauce.usersDisliked })
        // Sauce.updateOne({ _id: req.params.id }, { dislikes: sauce.dislikes, usersDisliked: sauce.usersDisliked }) // UpdateOne takes 3 parameters : filter, document, options
        .then(() => res.status(200).json({ message: 'Sauce updated successfully!'}))
        .catch(error => res.status(400).json({ error: error }));
    })
    .catch(error =>res.status(500).json({ error : error }))
};
