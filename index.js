const express = require("express");

const app = express();

const validator = require("email-validator");

app.use(express.json());

const PORT = 3000;

const DATABASE = {
  products: [
    {
      id: 1,
      name: "Arroz",
      price: 1000,
    },
  ],
  users: [
    {
      email: "johins@gmail.com",
      password: "1234567",
      name: "Johan",
      admin: true,
    },
  ],
  tokens: {
    [(0.2899243543452106).toString()]: "johins@gmail.com",
  },
  orders: [
    {
      id: 1,
      value: 1000,
      createdAt: new Date(),
      status: "CREADA",
      user: "johins@gmail.com",
    },
  ],
};

function validateUser(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(400).json({
      message: "Usuario no identificado",
    });
  }

  const token = `${authorization}`.split("Bearer ").pop();

  if (!token) {
    return res.status(400).json({
      message: "Usuario no identificado",
    });
  }

  const email = DATABASE.tokens[token];

  if (!email) {
    return res.status(400).json({
      message: "Usuario no identificado",
    });
  }

  const user = DATABASE.users.find((user) => user.email === email);

  if (!user) {
    return res.status(400).json({
      message: "Usuario no identificado",
    });
  }

  req.user = user;

  next();
}

function validateUserAdmin(req, res, next) {
  if (!req.user.admin) {
    return res.status(400).json({
      message: "Usuario no administrador",
    });
  }

  next();
}

//********** AUTH **********
app.post("/sign-up", (req, res) => {
  const { email, password, name } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Debes enviar un email",
    });
  }

  if (!password) {
    return res.status(400).json({
      message: "Debes enviar una contrasena",
    });
  }

  if (!name) {
    return res.status(400).json({
      message: "Debes enviar un nombre",
    });
  }

  if (`${password}`.length < 5) {
    return res.status(400).json({
      message: "La contrasena es muy corta",
    });
  }

  if (!validator.validate(email)) {
    return res.status(400).json({
      message: "No es un correo valido",
    });
  }

  if (DATABASE.users.find((user) => user.email === email)) {
    return res.status(400).json({
      message: "Usuario ya registrado",
    });
  }

  const user = {
    email,
    password,
    name,
    admin: false,
  };

  DATABASE.users.push(user);

  res.status(201).json({
    message: "Usuario creado",
    data: user,
  });
});

app.use("/sign-in", (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Debes enviar un email",
    });
  }

  if (!password) {
    return res.status(400).json({
      message: "Debes enviar una contrasena",
    });
  }

  if (!validator.validate(email)) {
    return res.status(400).json({
      message: "No es un correo valido",
    });
  }

  // Buscamos el usuario por email
  const user = DATABASE.users.find((user) => {
    return user.email === email;
  });

  if (!user) {
    return res.status(400).json({
      message: "No se encontro el usaurio con email " + email,
    });
  }

  // Validamos contrasena
  if (user.password !== password) {
    return res.status(400).json({
      message: "Contrasena incorrecta",
    });
  }

  const token = Math.random().toString();

  DATABASE.tokens = {
    ...DATABASE.tokens,
    [token]: user.email,
  };

  return res.json({
    message: "Usuario logueado correctamente",
    token,
  });
});

// ******* Orders *******
// Traer ordenes por usuario
app.get("/orders", validateUser, (req, res) => {
  const orders =
    DATABASE.orders.find((order) => order.email === req.user.email) || [];

  res.json({
    message: "Listado de ordenes por usuario",
    data: orders,
  });
});

// Traer todas las ordenes
app.get("/admin/orders", validateUser, validateUserAdmin, (req, res) => {
  const orders = DATABASE.orders || [];

  res.json({
    message: "Todas las ordenes",
    data: orders,
  });
});

// Cambiar el estado de una orden
app.patch("/admin/orders/:id", validateUser, validateUserAdmin, (req, res) => {
  const id = req.params.id;

  const status = req.body.status;

  const order = DATABASE.orders.find((order) => order.id === Number(id));

  if (!order) {
    res.status(404).json({
      message: "orden no encontrada",
    });
  }

  DATABASE.orders = DATABASE.orders.map((order) => {
    if (order.id === Number(id)) {
      return {
        ...order,
        status,
      };
    }

    return order;
  });

  res.json({
    message: "Orden editada",
    data: {
      ...order,
      status,
    },
  });
});

// Creacion de productos
// traer todos los productos
app.get("/producs",(req, res) => {
  const products   = DATABASE.products || []

  res.json({
    message: "Estos son todos los productos ",
    data: products,
  });
})
//crear un producto
app.post("/create/products", (req, res) => {
  console.log(req.body)
  const { id, name, price} = req.body;
  const products = {
    id,
    name,
    price

  }

  if (!id) {
    return res.status(400).json({
      message: "Debes asignar un id",
    });
  }

  if (!name) {
    return res.status(400).json({
      message: "Debes asignar un nombre al producto",
    });
  }

  if (!price) {
    return res.status(400).json({
      message: "Debes asignar un precio a el producto",
    });
  }


  DATABASE.products.push(products);

  res.status(201).json({
    message: "Producto disponible",
    data: products,
  });
});


app.listen(PORT, () => {
  console.log("API REST Acamica corriendo http://localhost:" + PORT);
});

// Crear producto
// editar producto
// eliminar producto

// TODO Crear orden
// Medios de pago
// Crear medios de pago
// Borrar medios de pago
// Ver todos los medios de pago
// Usuarios puedan editar pedido sin cerrar
// No editar pedido una vez cerrado
