# ORIGEN - Roles y permisos vigentes

Esta matriz refleja las reglas de Firestore y los controles de interfaz actuales. Las reglas son la autoridad de seguridad; ocultar una acción en la interfaz no reemplaza esas reglas. Cambios de permisos deben actualizar ambas capas y sus pruebas.

## Roles de empresa

| Rol               | Uso previsto                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `owner`           | Propietario protegido de la empresa y administrador completo. No se puede degradar ni eliminar desde invitaciones o gestión de miembros. |
| `admin`           | Administración de la empresa, usuarios, configuración y operaciones.                                                                     |
| `project_manager` | Gestión de proyectos, operaciones de campo, presupuestos y coordinación.                                                                 |
| `finance`         | Presupuestos, gastos, cotizaciones y datos de personal necesarios para la gestión financiera.                                            |
| `field_worker`    | Operación de campo, asistencia, visitas y uso de maquinaria.                                                                             |
| `viewer`          | Lectura de los datos de la empresa; sin escrituras operativas.                                                                           |

Los roles heredados `manager`, `supervisor` y `worker` ya no son los identificadores que esperan las reglas. No deben asignarse en nuevas membresías.

## Matriz de escritura aplicada por Firestore

| Área / colección                           | Roles con escritura                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Proyectos y cronograma                     | `owner`, `admin`, `project_manager`                                                                                                                    |
| Visitas de obra                            | `owner`, `admin`, `project_manager`, `field_worker`                                                                                                    |
| Asistencia: lectura                        | `owner`, `admin`, `project_manager`, `finance`, `field_worker`                                                                                         |
| Asistencia: escritura                      | `owner`, `admin`, `project_manager`, `field_worker`                                                                                                    |
| Gastos                                     | `owner`, `admin`, `finance`; `project_manager` y `field_worker` pueden crear únicamente el gasto interno pendiente que se origina en uso de maquinaria |
| Fichas completas de personal (`employees`) | `owner`, `admin`, `finance`                                                                                                                            |
| Directorio mínimo (`employeeDirectory`)    | lectura: `owner`, `admin`, `project_manager`, `finance`, `field_worker`; escritura: `owner`, `admin`, `finance`                                        |
| Configuración de empresa                   | `owner`, `admin`                                                                                                                                       |
| Cotizaciones                               | `owner`, `admin`, `project_manager`, `finance`                                                                                                         |
| APU                                        | `owner`, `admin`, `project_manager`, `finance`                                                                                                         |
| Maquinaria y registro de uso               | crear/editar: `owner`, `admin`, `project_manager`, `field_worker`; eliminar maquinaria y registros: `owner`, `admin`, `project_manager`                |
| Miembros e invitaciones                    | `owner`, `admin`; el propietario no se puede degradar ni eliminar                                                                                      |
| Lectura de datos de empresa                | Miembros autenticados de la empresa, sujeto a las reglas específicas de cada colección                                                                 |

La pantalla de equipo solo se muestra a `owner` y `admin`. Las invitaciones no pueden asignar el rol `owner`; para aceptarlas, la persona debe iniciar sesión con la dirección invitada y tener el correo verificado.

## Privacidad del personal

- Los documentos completos de `employees` —incluidos teléfono, jornal diario e información de afiliación— solo son legibles y modificables por `owner`, `admin` y `finance`.
- `project_manager` y `field_worker` pueden leer `employeeDirectory`, que contiene únicamente `id`, `companyId`, nombre y puesto para asignar asistencia.
- El rol `viewer` no puede leer fichas de personal, el directorio ni asistencia.
- Al crear/actualizar una ficha, la aplicación guarda en un batch la ficha privada y su entrada mínima del directorio. Al cargar fichas heredadas, un usuario autorizado completa las entradas de directorio faltantes; confirma que esa cuenta tenga permisos para ejecutar la migración antes de habilitar el acceso de campo.
- La productividad con salarios y las planillas solo se ofrecen a `owner`, `admin` y `finance`.

## Controles y límites

- Las reglas validan pertenencia a la empresa, rol, campos requeridos y, para APU, que el proyecto pertenezca a la misma empresa.
- La sesión de Firebase Authentication determina la identidad; la membresía de Firestore determina la empresa y el rol.
- Verifica la matriz contra los controles visuales de cada pantalla antes de cambiarla. Algunas acciones pueden ser visibles y ser rechazadas por Firestore; esas diferencias deben probarse con cada rol.
- Los cambios de reglas deben verificarse con `npm run test:rules`. Las pruebas de interfaz y lógica cliente se ejecutan con `npm test`.
- No publiques reglas permisivas ni uses la capa de interfaz como única barrera.
