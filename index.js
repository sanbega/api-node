const express = require("express");

const app = express();

const validator = require("email-validator");

app.use(express.json());

const PORT = 3000;

//  -------------------------  DATABASE  ------------------------- //

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
      email: "sanbega@gmail.com",
      password: "1234567",
      name: "Johan",
      admin: true,
    },
  ],
  tokens: {
    [(0.2899243543452106).toString()]: "johins@gmail.com",
  },
  methods: [
    {
      id: 1,
      name: "Pago en efectivo",
      description: "Debes pagar cuando se te entregue la orden",
    },
  ],
  orders: [
    {
      id: 1,
      value: 1000,
      createdAt: new Date(),
      status: "CREADA",
      user: {
        email: "johins@gmail.com",
        password: "1234567",
        name: "Johan",
        admin: true,
      },
      paymentMethod: {
        id: 1,
        name: "Pago en efectivo",
        description: "Debes pagar cuando se te entregue la orden",
      },
      products: [
        {
          id: 1,
          name: "Arroz",
          price: 1000,
        },
      ],
    },
  ],
};

//  -------------------------  MIDDLEWARE  ------------------------- //

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

function findProductById(req, res, next) {
  const id = req.params.id;

  const product = DATABASE.products.find(
    (product) => product.id === Number(id)
  );

  if (!product) {
    return res.status(404).json({
      message: "Producto no encontrado",
    });
  }

  req.product = product;

  next();
}

//  -------------------------  AUTH  ------------------------- //

// Register
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

// Login
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

  const user = DATABASE.users.find((user) => {
    return user.email === email;
  });

  if (!user) {
    return res.status(400).json({
      message: "No se encontro el usaurio con email " + email,
    });
  }

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

//  -------------------------  USER  ------------------------- //

//  ***************  ORDERS  *************** //
// Orders by user
app.get("/orders", validateUser, (req, res) => {
  const orders =
    DATABASE.orders.filter((order) => {
      return order.user.email === req.user.email;
    }) || [];

  res.json({
    message: "Listado de ordenes por usuario",
    data: orders,
  });
});

// Create order
app.post("/orders", validateUser, (req, res) => {
  const { cart, paymentMethodId } = req.body;

  if (!cart) {
    return res.status(400).json({
      message: "Debes enviar los productos a comprar",
    });
  }

  if (!Array.isArray(cart)) {
    return res.status(400).json({
      message: "Debes enviar los productos correctamente",
    });
  }

  if (!cart.length) {
    return res.status(400).json({
      message: "Debes enviar al menos un producto",
    });
  }

  if (!paymentMethodId) {
    return res.status(400).json({
      message: "Debes escoger un metodo de pago",
    });
  }

  const paymentMethod = DATABASE.methods.find(
    (method) => method.id === Number(paymentMethodId)
  );

  if (!paymentMethod) {
    return res.status(404).json({
      message: "Metodo de pago no encontrado",
    });
  }

  const products = DATABASE.products.reduce((allProducts, product) => {
    const productFound = cart.find(
      (cartProduct) => Number(cartProduct.id) === product.id
    );

    if (productFound) {
      allProducts.push({
        ...product,
        quantity: productFound.quantity,
      });
    }

    return allProducts;
  }, []);

  const id = DATABASE.orders[DATABASE.orders.length - 1]?.id || 0;

  const value = products.reduce((total, product) => {
    return total + (product.price * Math.abs(Number(product.quantity)) || 0);
  }, 0);

  const order = {
    id: id + 1,
    value,
    createdAt: new Date(),
    status: "CREADA",
    user: req.user,
    products,
    paymentMethod,
  };

  DATABASE.orders.push(order);

  res.json({
    message: "Order creada correctamente",
    data: order,
  });
});

// Edit order
app.post("/orders/:id", validateUser, (req, res) => {
  const { cart, paymentMethodId } = req.body;

  const id = req.params.id;

  const order = DATABASE.orders.find((order) => order.id === Number(id));

  if (!order) {
    return res.status(404).json({
      message: "Order no encontrada",
    });
  }

  if (order.status === "CERRADA") {
    return res.status(404).json({
      message: "Ya no puedes editar la orden, esta cerrada",
    });
  }

  if (order.user.email !== req.user.email) {
    return res.status(401).json({
      message: "No eres el due;o de la orden",
    });
  }

  if (!cart) {
    return res.status(400).json({
      message: "Debes enviar los productos a comprar",
    });
  }

  if (!Array.isArray(cart)) {
    return res.status(400).json({
      message: "Debes enviar los productos correctamente",
    });
  }

  if (!cart.length) {
    return res.status(400).json({
      message: "Debes enviar al menos un producto",
    });
  }

  if (!paymentMethodId) {
    return res.status(400).json({
      message: "Debes escoger un metodo de pago",
    });
  }

  const paymentMethod = DATABASE.methods.find(
    (method) => method.id === Number(paymentMethodId)
  );

  if (!paymentMethod) {
    return res.status(404).json({
      message: "Metodo de pago no encontrado",
    });
  }

  const products = DATABASE.products.reduce((allProducts, product) => {
    const productFound = cart.find(
      (cartProduct) => Number(cartProduct.id) === product.id
    );

    if (productFound) {
      allProducts.push({
        ...product,
        quantity: productFound.quantity,
      });
    }

    return allProducts;
  }, []);

  const value = products.reduce((total, product) => {
    return total + (product.price * Math.abs(Number(product.quantity)) || 0);
  }, 0);

  const editedOrder = {
    ...order,
    value,
    products,
    paymentMethod,
  };

  DATABASE.orders = DATABASE.orders.map((order) => {
    if (order.id === Number(id)) {
      return editedOrder;
    }

    return order;
  });

  res.json({
    message: "Order editada correctamente",
    data: editedOrder,
  });
});

//  -------------------------  ADMIN  ------------------------- //

//  ***************  ORDERS  *************** //
// Get Order
app.get("/admin/orders", validateUser, validateUserAdmin, (req, res) => {
  const orders = DATABASE.orders || [];

  res.json({
    message: "Todas las ordenes",
    data: orders,
  });
});

// Change order status
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

//  ***************  PRODUCTS  *************** //
// Get all products
app.get("/admin/products", validateUser, validateUserAdmin, (req, res) => {
  const products = DATABASE.products || [];

  res.json({
    message: "Estos son todos los productos ",
    data: products,
  });
});

// Create product
app.post("/admin/products", validateUser, validateUserAdmin, (req, res) => {
  const { name, price } = req.body;

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

  if (isNaN(Number(price))) {
    return res.status(400).json({
      message: "Precio debe ser un numero",
    });
  }

  const id = DATABASE.products[DATABASE.products.length - 1]?.id || 0;

  const product = {
    name,
    price,
    id: id + 1,
  };

  DATABASE.products.push(product);

  res.status(201).json({
    message: "Producto disponible",
    data: product,
  });
});

// Edit product
app.patch(
  "/admin/products/:id",
  validateUser,
  validateUserAdmin,
  findProductById,
  (req, res) => {
    const { name, price } = req.body;

    const id = req.params.id;

    const product = req.product;

    if (price && isNaN(Number(price))) {
      return res.status(400).json({
        message: "Precio debe ser un numero",
      });
    }

    const editedProduct = {
      ...product,
      name: name || product.name,
      price: price || product.price,
    };

    DATABASE.products = DATABASE.products.map((product) => {
      if (product.id === Number(id)) {
        return editedProduct;
      }

      return product;
    });

    res.status(201).json({
      message: "Producto editado correctamente",
      data: editedProduct,
    });
  }
);

// Delete product
app.delete(
  "/admin/products/:id",
  validateUser,
  validateUserAdmin,
  findProductById,
  (req, res) => {
    const product = req.product;

    const id = req.params.id;

    DATABASE.products = DATABASE.products.filter(
      (product) => product.id !== Number(id)
    );

    return res.json({
      message: "Producto eliminado",
      data: product,
    });
  }
);

//  *************** PAYMENT METHODS  *************** //


// Get all payments mehtods
app.get("/admin/methods", validateUser, validateUserAdmin, (req, res) => {
  const methods = DATABASE.methods || [];

  res.json({
    message: "Estos son todos los methods ",
    data: methods,
  });
});
// Create product
app.post("/admin/methods", validateUser, validateUserAdmin, (req, res) => {
  const { name, id } = req.body;

  const product = {
    name,
    id ,
  };

  if (!name) {
    return res.status(400).json({
      message: "Debes asignar el nombre del metodo de pago",
    });
  }

  if (!id) {
    return res.status(400).json({
      message: "Debes escojer el id del metodo de pago",
    });
  }

  if (isNaN(Number(id))) {
    return res.status(400).json({
      message: "Precio debe ser un numero",
    });
  }
})


  

// Delete payment method
app.delete("/admin/methods/:id",validateUser,  validateUserAdmin,
  (req, res) => {
    const methods = req.product;

    const id = req.params.id;

    DATABASE.methods = DATABASE.methods.filter(
      (methods) => methods.id !== Number(id)
    );

    return res.json({
      message: "Producto eliminado",
      data: product,
    });
  }
);

// Edit payment method
app.patch("/admin/methods/:id",validateUser,  validateUserAdmin,(req, res) => {
  const { name, id } = req.body;

  const ib = req.methods.id;

  const methods = req.methods;

  if (price && isNaN(Number(price))) {
    return res.status(400).json({
      message: "Precio debe ser un numero",
    });
  }

  const editedMethods = {
    ...methods,
    name: name || methods.name,
    id: id || methods.id,
  };

  DATABASE.methods = DATABASE.methods.map((methods) => {
    if (methods.id === Number(id)) {
      return editedMethods;
    }

    return methods;
  });

  res.status(201).json({
    message: "Producto editado correctamente",
    data: editedMethods,
  });
}
);



app.listen(PORT, () => {
  console.log("API REST Acamica corriendo http://localhost:" + PORT);
});