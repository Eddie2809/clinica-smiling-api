/*
    API CONSULTORIO DENTAL

    Autor: Eddie Alejandro Vargas Mendoza
    Última modificación: 18/11/2022
*/
const express = require('express')
const cors = require('cors')
const knex = require('knex')

const app = express()
const db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
})
const port = process.env.PORT

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false}))

// =================== FUNCIONES AUXILIARES - NO MOVER =================================================
const insertarEn = (tabla,contenido,res) => {
    db(tabla).returning('*').insert(contenido).then(nuevaFila => res.json(nuevaFila[0])).catch(err => {
        res.status(400).json('Algo salió mal')
    })
}
const obtenerDe = (tabla,contenido,res) => {
    db(tabla).select(contenido).then(respuesta => {
        res.json(respuesta)
    }).catch(err => {
        res.status(400).json(err)
    })
}
const obtenerDonde = (tabla,contenido,condicion,res) => {
    db(tabla).select(contenido).where(condicion).then(respuesta => {
        res.json(respuesta)
    }).catch(err => {
        res.status(400).json(err)
    })
}
const actualizarDonde = (tabla,donde,datosActualizar,res) => {
    db(tabla).where(donde).update(datosActualizar).then(respuesta => {
        res.status(200).json('Tarea realizada con éxito')
    })
    .catch(err => {
        res.status(400).json(err)
    })
}
// =====================================================================================================

app.get('/',(req,res) => {
    res.json('Clinica Smiling API')
})

app.post('/registrar-usuario',(req,res) => {
    let {nombre,apellido,correo,contrasena,telefono,tipo_de_usuario} = req.body
    
    insertarEn('usuarios',{
        nombre: nombre,
        apellido: apellido,
        correo: correo,
        contrasena: contrasena,
        telefono: telefono,
        tipo_de_usuario: tipo_de_usuario
    },res)
})

app.post('/crear-reservacion',(req,res) => {
    let {horaInicio,horaFin,motivoCreacion,idCliente,idCreador} = req.body
    let inicio,fin
    let nuevoInicio = new Date(horaInicio)
    let nuevoFin = new Date(horaFin)
    let invalidDate = false

    db('reservaciones').select('*').where({cancelada: false, finalizada: false}).then(reservaciones => {
        reservaciones.forEach(reservacion => {
            inicio = new Date(reservacion.hora_inicio)
            fin = new Date(reservacion.hora_fin)

            if(!(nuevoInicio >= fin || nuevoFin <= inicio)){
                invalidDate = true
            }
            
        })

        if(!invalidDate){
            insertarEn('reservaciones',{
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                motivo_creacion: motivoCreacion,
                cancelada: false,
                finalizada: false,
                id_cliente: idCliente,
                id_creador: idCreador,
            },res)
        }
        else{
            res.status(400).json('Horario no disponible')
        }
    })

})

app.get('/obtener-usuarios',(req,res) => {
    db('usuarios').join('tipos_de_usuario','usuarios.tipo_de_usuario','=','tipos_de_usuario.id').select({
        id: 'usuarios.id',
        nombre: 'usuarios.nombre',
        apellido: 'usuarios.apellido',
        correo: 'usuarios.correo',
        telefono: 'usuarios.telefono',
        tipo_de_usuario: 'tipos_de_usuario.nombre'
    }).then(usuarios => {
        res.json(usuarios)
    })
    .catch(err => {
        res.status(400).json(err)
    })
})

app.get('/obtener-reservaciones-totales',(req,res) => {
    db('reservaciones').join('usuarios','reservaciones.id_cliente','=','usuarios.id')
    .select('reservaciones.id','reservaciones.hora_inicio','reservaciones.hora_fin','reservaciones.motivo_creacion','reservaciones.motivo_cancelacion','reservaciones.id_cliente','usuarios.nombre','usuarios.apellido')
    .then(resp => {
        res.json(resp)
    })
    .catch(err => {
        res.status(400).json(err)
    })
})

app.get('/obtener-reservaciones-canceladas-totales',(req,res) => {
    //obtenerDonde('reservaciones','*',{cancelada: true,finalizada: false},res)
    db('reservaciones').where({cancelada: true,finalizada: false}).join('usuarios','reservaciones.id_cliente','=','usuarios.id')
    .select('reservaciones.id','reservaciones.hora_inicio','reservaciones.hora_fin','reservaciones.motivo_creacion','reservaciones.motivo_cancelacion','reservaciones.id_cliente','usuarios.nombre','usuarios.apellido')
    .then(resp => {
        res.json(resp)
    })
    .catch(err => {
        res.status(400).json(err)
    })
})

app.get('/obtener-reservaciones-pendientes-totales',(req,res) => {
    //obtenerDonde('reservaciones','*',{finalizada: false, cancelada: false},res)
    db('reservaciones').where({cancelada: false,finalizada: false}).join('usuarios','reservaciones.id_cliente','=','usuarios.id')
    .select('reservaciones.id','reservaciones.hora_inicio','reservaciones.hora_fin','reservaciones.motivo_creacion','reservaciones.motivo_cancelacion','reservaciones.id_cliente','usuarios.nombre','usuarios.apellido')
    .then(resp => {
        res.json(resp)
    })
    .catch(err => {
        res.status(400).json(err)
    })
})

app.get('/obtener-reservaciones-finalizadas-totales',(req,res) => {
    //obtenerDonde('reservaciones','*',{finalizada: true, cancelada: false},res)
    db('reservaciones').where({cancelada:false ,finalizada:true }).join('usuarios','reservaciones.id_cliente','=','usuarios.id')
    .select('reservaciones.id','reservaciones.hora_inicio','reservaciones.hora_fin','reservaciones.motivo_creacion','reservaciones.motivo_cancelacion','reservaciones.id_cliente','usuarios.nombre','usuarios.apellido')
    .then(resp => {
        res.json(resp)
    })
    .catch(err => {
        res.status(400).json(err)
    })
})

app.post('/verificar-credenciales',(req,res) => {
    let {correo,contrasena} = req.body
    obtenerDonde('usuarios','*',{correo:correo,contrasena:contrasena},res)
})

app.post('/obtener-reservaciones-pendientes',(req,res) => {
    let {idUsuario} = req.body
    obtenerDonde('reservaciones','*',{id_cliente: idUsuario,finalizada: false,cancelada: false},res)
})

app.post('/obtener-reservaciones-canceladas',(req,res) => {
    let {idUsuario} = req.body
    obtenerDonde('reservaciones','*',{id_cliente: idUsuario, finalizada: false,cancelada: true},res)
})

app.post('/obtener-reservaciones-finalizadas',(req,res) => {
    let {idUsuario} = req.body
    obtenerDonde('reservaciones','*',{id_cliente: idUsuario,finalizada: true,cancelada: false},res)
})

app.post('/cancelar-reservacion',(req,res) => {
    let {idReservacion,motivo} = req.body
    actualizarDonde('reservaciones',{id: idReservacion},{cancelada: true, motivo_cancelacion: motivo},res)
})

app.post('/finalizar-reservacion',(req,res) => {
    let {idReservacion} = req.body
    actualizarDonde('reservaciones',{id: idReservacion},{finalizada: true},res)
})

app.post('/cambiar-rol',(req,res) => {
    let {nuevoRol,idUsuario} = req.body
    actualizarDonde('usuarios',{id: idUsuario},{tipo_de_usuario: nuevoRol},res)
})

app.post('/restaurar-sesion',(req,res) => {
    const {SID} = req.body

    db.select('*').from('usuarios').where({id_sesion: SID})
    .then(user => {
        if(user[0].id_sesion === SID){
            res.json(user)
        }
    })
    .catch(err => res.status(400).json('Algo salió mal'))
})

app.post('/generar-sid',(req,res) => {
    const {userId} = req.body

    let newSid = ""

    for(let i = 0; i < 128; i++){
        Math.random() > 0.5? newSid+=0 : newSid+=1
    }

    db('usuarios').where({id: userId})
    .update({id_sesion: newSid})
    .then(() => res.json(newSid))
    .catch(err => res.status(400).json('Algo salió mal'))
})

app.listen(port)