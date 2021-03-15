/*  Archivo controllers/usuarios.js*/
const mongoose = require('mongoose');
const Usuario = mongoose.model('Usuario');
const passport = require('passport');

function registroUsuario(req, res, next) {
	// Instancia de usuario utilizando la clase Usuario
	const body = req.body,
		password = body.password;
	delete body.password;
	const usuario = new Usuario(body);
	usuario.crearPassword(password);
  usuario.
  validate().
  then((result) => {
    usuario
		.save()
		.then((user) => {
			return res.status(201).json(user.toAuthJSON());
		})
		.catch(next);
  })
  .catch((err) => {
    return res.status(404).send("No se pudo guardar usuario");
  });
}

function createMongoParams(params) {
  // El username y email son unicos y no se toma en cuenta en esta consulta
	const { nombre, apellido, genero, edad, edadMin, edadMax, tipo } = params;
	const filtros = Object.keys(params);

	let rules = {};
	if (filtros.length > 0) {
		rules = {
			$and: []
		};
    //para cuando solo hay un nombre
    if (typeof nombre === 'string') {
			rules['$and'].push({ nombre: nombre });
      //Cuando hay un arreglo de nombres
		} else if (typeof nombre === 'object') {
			const nombres = nombre.map((nom) => ({ nombre: nom}));
			rules['$and'].push({ $or: nombres });
			console.log(rules['$and']);
		}

    if (typeof apellido === 'string') {
			rules['$and'].push({ apellido: apellido });
		} else if (typeof apellido === 'object') {
      //Usuarios.find({ '$and': [ { '$or': [ { apellido: 'quintero' }, { apellido: 'vazquez' } ] } )
			const apellidos = apellido.map((ape) => ({ apellido: ape }));
			rules['$and'].push({ $or: apellidos });
			console.log(rules['$and']);
		}

    //Solo hay dos opciones, por lo tanto se asigna directamente
    if (genero) {
			rules['$and'].push({ genero: genero });
		}

    // Usuarios.find({ '$and': [ { '$and': [ { edad: { '$gte': 20 } }, { edad: { '$lte': 40 } } ] } ]})
		if (edad) {
			rules['$and'].push({ edad: edad });
		} else {
			if (edadMin && edadMax) {
				rules['$and'].push({
					$and: [
						{
							edad: {
								$gte: edadMin
							}
						},
						{
							edad: {
								$lte: edadMax
							}
						}
					]
				});
			} else {
				if (edadMin)
					rules['$and'].push({
						edad: {
							$gte: edadMin
						}
					});

				if (edadMax)
					rules['$and'].push({
						edad: {
							$lte: edadMax
						}
					});
			}
		}

    if (typeof tipo === 'number') {
			rules['$and'].push({ tipo: tipo });
		} else if (typeof tipo === 'object') {
			const tipos = tipo.map((tip) => ({ tipo: tip }));
			rules['$and'].push({ $or: tipos });
			console.log(rules['$and']);
		}

	} else {
    return {};
  }
  // si no hay filtros entonces se borra la informacion del objeto
  if(rules.$and.length === 0) {
    delete rules.$and;
  }
  
	return rules;
}

function obtenerUsuarioPorId(req, res, next) {
  Usuario.findById(req.params.id, (err, user) => {
    if (!user || err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Error, usuario no encontrado');
      return res;
    }
    return res.status(200).json(user.publicData());
  }).catch(next);
}


function obtenerUsuarios(req, res, next) {
	const { query } = req;
  // funcion que crea un query para filtrar consultas
	let mongoQuery = createMongoParams(query);
  let campo = query.campo;
  let limit = query.limit;
  let projection;
  let documents;
  // arreglo de campos para mostrar en projection del tipo ["username", "nombre"]
  if (campo && typeof campo === "object") {
    // se convierte el arreglo a cadena
    projection = campo.join(" ");
    // cuando solo se tiene un campo
  } else if (campo && typeof campo === "string") {
    projection = campo;
  } else {
    projection = "";
  }
  // Se agrega un limite de los campos a mostrar
  if(limit) {
    // Se hace el parseo a int para que pueda emitir la consulta
    documents = parseInt(limit);
  }
	Usuario.find(mongoQuery, projection, (err, users) => {
    
		if (!users || err || users.length === 0) {
			return res.status(404).send('Ninguna conincidencia fué encontrada');
		}
		var array = [];

		users.forEach(function(user) {
			array.push(user.publicData());
		});

		res.status(200).send(array);
	}).limit(documents).
  catch(next);
}

function modificarUsuario(req, res, next) {
	// metodo para modificar usuarios, si no encuentra campos no los toma en cuenta
	console.log("El que lo intenta", res.locals.user.id)
	let nombreUsuario; 
	Usuario.findById(req.params.id, (err, user) => {
		console.log("El que quiere modificar", user.id)
		nombreUsuario = user.id;
		console.log("nombreUSuario", nombreUsuario)
	  }).then(() => {
		nombreUsuario = user.id;
	})
	  console.log("son iguales?", nombreUsuario, res.locals.user.id)
	  if(nombreUsuario === res.locals.user.id || res.locals.user.tipo === 0) {
	console.log("")
  	const id = req.params.id;
	let modificacion = {};
	const { username, nombre, apellido, genero, edad, email, tipo } = req.body;

  if (typeof username !== 'undefined') modificacion.username = username;

	if (typeof nombre !== 'undefined') modificacion.nombre = nombre;

	if (typeof apellido !== 'undefined') modificacion.apellido = apellido;

	if (typeof genero !== 'undefined') modificacion.genero = genero;

	if (typeof edad !== 'undefined') modificacion.edad = edad;

  if (typeof email !== 'undefined') modificacion.email = email;

	if (typeof tipo !== 'undefined') modificacion.tipo = tipo;

	Usuario.findByIdAndUpdate(id, modificacion, function(err, doc) {
    if (err) return res.status(400).send("Error al modificar");
})
		.then(() => {
			return res.status(200).send({ estado: 'Usuario modificado exitosamente' });
		})
		.catch(next);
	} else {
		return res.status(401).send("No tienes permisos para modificar este usuario");
	}
}


function eliminarUsuario(req, res, next) {
  // únicamente borra a su propio usuario obteniendo el id del token
  console.log("El que lo intenta", res.locals.user.id)
	let nombreUsuario; 
	Usuario.findById(req.params.id, (err, user) => {
		console.log("El que quiere modificar", user.id)
		nombreUsuario = user.id;
	  })
	  if(nombreUsuario === res.locals.user.id || res.locals.user.tipo === 0) {
  const id = req.params.id;
	Usuario.findByIdAndDelete(id)
		.then((result) => {
			if (!result) {
				return res.status(404).send('Usuario no encontrado');
			}
      console.log()
			res.status(200).json({ estado: `Usuario con id ${id} y username ${result.username} eliminado`, usuario: result });
		})
  .catch(next);
	} else {
		return res.status(401).send("No tienes permisos para eliminar este usuario");
	}
}

function iniciarSesion(req, res, next) {
	if (!req.body.email) {
		return res.status(422).json({ errors: { email: 'no puede estar vacío' } });
	}

	if (!req.body.password) {
		return res.status(422).json({ errors: { password: 'no puede estar vacío' } });
	}

	passport.authenticate('local', { session: false }, function(err, user, info) {
		if (err) {
			return next(err);
		}

		if (user) {
			user.token = user.generarJWT();
			return res.json({ user: user.toAuthJSON() });
		} else {
			return res.status(422).json(info);
		}
	})(req, res, next);
}

module.exports = {
	registroUsuario,
	obtenerUsuarios,
	obtenerUsuarioPorId,
	modificarUsuario,
	eliminarUsuario,
	iniciarSesion,
};
