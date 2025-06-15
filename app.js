// * ===== Modulos ===== * //
const express = require("express");
const morgan = require("morgan");
const session = require("express-session");
const path = require("path");
const chalk = require("chalk");
const User = require("./model/user");
const bcrypt = require("bcrypt");

// * ===== Instancias ===== * //
const app = express(); // Create an instance of express
const mongoose = require("mongoose"); // Import mongoose for MongoDB connection
const Feed = require("./model/feed"); // Import the feed model

// * ===== Archivos estaticos  ===== * //
app.use("/css", express.static(path.join(__dirname, "public", "css"))); // Serve static CSS files
app.use("/js", express.static(path.join(__dirname, "public", "js")));
app.use("/image", express.static(path.join(__dirname, "public", "image")));

// * ===== Conexión a MongoDB ===== * //
// Connect to MongoDB (only once when the server starts)
mongoose
  .connect("mongodb://localhost:27017/my_first_db")
  .then(() =>
    console.log(chalk.bgHex("#b2ebf2").black.bold(" 🌤️  MongoDB Connected 🌤️ "))
  )
  .catch(console.error);

// * =====  Middleware ===== * //
app.use(morgan("common")); // Use morgan middleware for logging
app.use(
  // Creacion del manejo de sesion
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: true,
    // Uso de una cokkie
    cookie: {
      maxAge: 1000 * 60 * 5,
    }, // 5 minutos
  })
);
// Para usar la informacion de los formularios directamente
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies

// * ===== Rutas  ===== * //
// Pagina principal usando EJS
app.get("/", (req, res) => {
  res.render("index", { username: req.session.username, errorMensaje: null });
});
// Pagina de escribir posts
app.get("/write", (req, res) => {
  if (req.session.username) {
    res.render("write");
  } else {
    res.redirect("/");
  }
});
app.post("/write", async (req, res) => {
  const { content } = req.body;

  if (!req.session.username) {
    return res.redirect("/");
  }

  const newFeed = new Feed({
    content,
    author: req.session.username,
  });

  // Save the new feed to the database
  // and redirect to the posts page await newFeed
  await newFeed
    .save()
    .then(() => {
      console.log("Feed saved successfully");
      res.redirect("/posts");
    })
    .catch((err) => {
      console.error("Error saving feed:", err);
      res.status(500).send("Error saving feed");
    });
});

// Pagina de posts
app.get("/posts", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    // Buscar al usuario logueado
    const user = await User.findOne({ username: req.session.username });

    // Buscar los posts donde el autor es el usuario o sus amigos
    const feeds = await Feed.find({
      author: { $in: [...user.friends, user.username] }
    }).sort({
      createdAt: -1 // Orden descendente por fecha
    });

    // Agregar campo isLiked para saber si el usuario dio like
    const posts = feeds.map((feed) => ({
      ...feed.toObject(),
      isLiked: feed.likes.includes(req.session.username)
    }));

    res.render("posts", { posts });
  } catch (error) {
    console.error("Error loading posts", error);
    res.status(500).send("Error loading posts");
  }
});
// Enrutamiento para dar like a un post
app.post("/posts/:uuid/like", async (req, res) => {
  if (!req.session.username) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const feed = await Feed.findOne({ uuid: req.params.uuid }); // Buscar post por UUID

    if (!feed) {
      return res.status(404).send("Feed not found");
    }

    const username = req.session.username;

    // Alternar like
    if (feed.likes.includes(username)) {
      // Ya dio like, se lo quitamos
      feed.likes = feed.likes.filter((user) => user !== username);
    } else {
      // No dio like, lo agregamos
      feed.likes.push(username);
    }

    await feed.save();

    res.json({
      likesCount: feed.likes.length,
      isLiked: feed.likes.includes(username) // Devuelve si está liked tras guardar
    });
  } catch (err) {
    console.error("Error toggling like:", err);
    res.status(500).send("Error toggling like");
  }
});



// Pagina de login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      returnres.send("Invalid user name or password!");
    }
    req.session.username = user.username;
    res.redirect("/posts");
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Error during login");
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Registro de usuario
app.get("/register", (req, res) => {
  res.render("register");
});
// Ruteo de usuario
app.post("/register", async (req, res) => {
  const { username, password, name } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      returnres.send("Usernamealreadyexists!");
    }
    const newUser = new User({ username, password, name });
    await newUser.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).send("Error during registration");
  }
});
// Enrutamiento de la pantalla de búsqueda/lista de amigos
app.get("/friends/list", async (req, res) => {
  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    const user = await User.findOne({ username: req.session.username });
    res.render("friends", {
      friends: user.friends,
      findedfriends: []
    });
  } catch (err) {
    console.error("Error fetching friends list:", err);
    res.status(500).send("Error fetching friends list");
  }
});

// Enrutamiento para buscar amigos
app.post("/friends/search", async (req, res) => {
  const { friendUsername } = req.body;

  if (!req.session.username) {
    return res.redirect("/");
  }

  try {
    // Buscar al usuario que está logueado
    const user = await User.findOne({ username: req.session.username });

    // Buscar usuarios cuyo nombre incluya el texto buscado,
    // excluyendo al propio usuario y a los ya agregados como amigos
    const findedfriends = await User.find({
      $and: [
        { username: { $regex: friendUsername, $options: "i" } },
        { username: { $nin: [...user.friends, user.username] } }
      ]
    });

    res.render("friends", {
      friends: user.friends,
      findedfriends
    });
  } catch (err) {
    console.error("Error searching for friends:", err);
    res.status(500).send("Error searching for friends");
  }
});
// Enrutamiento para agregar un amigo
app.post("/friends/add", async (req, res) => {
  const { friendUsername } = req.body;
  if (!req.session.username) {
    return res.redirect("/");
  }
  try {
    const user = await User.findOne({ username: req.session.username });
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) {
      return res.send("User not found!");
    }
    if (user.friends.includes(friend.username)) {
      return res.send("Already friends!");
    }
    user.friends.push(friend.username);
    await user.save();
    res.redirect("/friends/list");
  } catch (err) {
    console.error("Error adding friend:", err);
    res.status(500).send("Error adding friend");
  }
});



// * ===== Escuchando en el puerto 3000 ===== * //
app.listen(3000, () => {
  console.log(chalk.bgHex("#ff223").bold(" 😀 USO DE EXPRESS 🎉"));
  console.log(
    chalk.green("Server Posts is Running on: ") +
      chalk.cyan("http://localhost:3000")
  );
  console.log(chalk.gray("Press Ctrl + C to stop the server"));
});

// * --------- Uso de EJS en Express --------- * //
app.set("view engine", "ejs"); // EJS setup
app.set("views", path.join(__dirname, "views")); // Set the views directory

// const response = await fetch(`/posts/${postUuid}/like`, {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });
