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
	usuario
		.save()
		.then((user) => {
			return res.status(201).json(user.toAuthJSON());
		})
		.catch(next);
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
    if (typeof nombre === 'string') {
			rules['$and'].push({ nombre: nombre });
		} else if (typeof nombre === 'object') {
			const nombres = nombre.map((nom) => ({ nombre: nom}));
			rules['$and'].push({ $or: nombres });
			console.log(rules['$and']);
		}

    if (typeof apellido === 'string') {
			rules['$and'].push({ apellido: apellido });
		} else if (typeof apellido === 'object') {
			const apellidos = apellido.map((ape) => ({ apellido: ape }));
			rules['$and'].push({ $or: apellidos });
			console.log(rules['$and']);
		}

    if (genero) {
			rules['$and'].push({ genero: genero });
		}

    
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

	}
  if(rules.$and.length === 0) {
    delete rules.$and;
  }

	return rules;
}

function obtenerUsuarioPorId(req, res, next) {
  Usuario.findById(req.params.id, (err, user) => {
    if (!user || err) {
      return res.sendStatus(401).send('Error, el usuario no existe');
    }
    return res.status(200).json(user.publicData());
  }).catch(next);
}


function obtenerUsuarios(req, res, next) {
	const { query } = req;
	let mongoQuery = createMongoParams(query);
  let campo = query.campo;
  let limit = query.limit;
  let projection;
  let documents;
  console.log(campo)
  console.log(mongoQuery)
  if (campo && typeof campo === "object") {
    projection = campo.join(" ");
  } else if (campo && typeof campo === "string") {
    projection = campo;
  } else {
    projection = "";
  }
  if(limit) {
    documents = parseInt(limit);
  }
	Usuario.find(mongoQuery, projection, (err, users) => {
    
		if (!users || err) {
			return res.status(404).send('Ninguna conincidencia fué encontrada');
		}
		var array = [];

		users.forEach(function(user) {
			array.push(user);
		});

		res.status(200).send(array);
	}).limit(documents).catch(next);
}

function modificarUsuario(req, res, next) {
	// console.log(req.usuario);
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

	Usuario.findByIdAndUpdate(id, modificacion)
		.then(() => {
			return res.status(200).send({ estado: 'Usuario modificado exitosamente' });
		})
		.catch(next);
}


function eliminarUsuario(req, res, next) {
  // únicamente borra a su propio usuario obteniendo el id del token
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
