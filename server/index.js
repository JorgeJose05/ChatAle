import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import bodyParser from "body-parser";

const port = process.env.PORT ?? 3000;

const app = express();

const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

// Lista en memoria para almacenar usuarios
const usuarios = [];
// Lista de usuarios conectados (almacenamos por socket.id)
const usuariosConectados = [];
let salas = {};

app.use(logger("dev"));
app.use(express.static(process.cwd() + "/client"));

// Middleware para parsear datos del formulario (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true })); // Para parsear datos de formularios

// Middleware para parsear JSON
app.use(bodyParser.json()); // Para parsear cuerpos JSON

io.on("connection", (socket) => {
  console.log("a user has connected!");

  socket.on("disconnect", () => {
    const index = usuariosConectados.findIndex(
      (user) => user.socketId === socket.id
    );
    if (index !== -1) {
      const nombreUsuario = usuariosConectados[index].nombre;
      usuariosConectados.splice(index, 1); // Eliminar al usuario de la lista
      console.log(`${nombreUsuario} se ha desconectado.`);
      io.emit("usuarios", usuariosConectados); // Emitir la nueva lista de usuarios
    }
  });

  socket.on("chat-message", (msg) => {
    //esto va a ser en broadcast
    io.emit("chat-message", msg);
  });

  // Cuando un usuario se conecta, agregarlo a la lista de usuarios conectados
  socket.on("new-user", (nombreUsuario) => {
    // Añadir el usuario a la lista de conectados
    usuariosConectados.push({ nombre: nombreUsuario, socketId: socket.id });
    console.log("Usuarios conectados: ", usuariosConectados);

    // Emitir la lista de usuarios conectados a todos
    io.emit("usuarios", usuariosConectados);
  });
});

// Rutas

// Rutas para obtener la lista de usuarios
app.get("../server/index.js", (req, res) => {
  res.json(usuarios); // Devuelve la lista de usuarios en formato JSON
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/inicio.html");
});

app.get("/menu", (req, res) => {
  res.sendFile(process.cwd() + "/client/menu.html"); // Página de opciones
});

app.get("/chat", (req, res) => {
  res.sendFile(process.cwd() + "/client/chat.html"); // Página del chat
});

// Registro de usuario
app.post("/register", (req, res) => {
  const { nombre, contraseña } = req.body;

  if (!nombre || !contraseña) {
    return res
      .status(400)
      .send("Nombre de usuario y contraseña son requeridos");
  }

  // Verificar si el usuario ya existe
  const usuarioExistente = usuarios.find((user) => user.nombre === nombre);
  if (usuarioExistente) {
    return res.status(400).send("El usuario ya existe");
  }

  // Agregar el nuevo usuario a la lista
  usuarios.push({ nombre, contraseña });
  console.log("Usuarios registrados:", usuarios);
  return res.status(200).send(`Registro exitoso Usuario: ${nombre}`);
});

app.post("/login", (req, res) => {
  const { nombre, contraseña } = req.body;

  // Validar credenciales
  const user = usuarios.find(
    (u) => u.nombre === nombre && u.contraseña === contraseña
  );

  if (user) {
    // Enviar mensaje y ruta de redirección
    return res
      .status(200)
      .json({ message: "Inicio de sesión exitoso", redirect: "/menu" });
  } else {
    return res
      .status(400)
      .json({ message: "Usuario o contraseña incorrectos" });
  }
});

// Iniciar servidor
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
export { usuariosConectados };
