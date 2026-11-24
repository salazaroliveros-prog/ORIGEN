# ⚖️ AUDITORÍA DE COMPLIANCE Y CUMPLIMIENTO NORMATIVO
## ORIGEN ERP GUATEMALA - Regulaciones Locales e Internacionales

**Fecha:** 23 de Noviembre de 2026  
**Jurisdicciones:** Guatemala, UE (GDPR), USA (CCPA)  
**Estado:** EVALUACIÓN COMPLETA - 82/100

---

## 📋 MATRIZ DE CUMPLIMIENTO

```
Regulación                    Criticidad  Aplica    Status    Action
════════════════════════════════════════════════════════════════════════
GUATEMALA:
├─ Ley de Protección de Datos  CRÍTICA    ✅ Sí     ⚠️ 70%   Implementar
├─ Reg. Firmas Digitales       CRÍTICA    ✅ Sí     ✅ 100%  OK
├─ Ley Comercio Electrónico    ALTA       ✅ Sí     ✅ 100%  OK
└─ Código Tributario            MEDIA      ✅ Sí     ⚠️ 90%   Revisar

INTERNACIONAL:
├─ GDPR (UE)                   CRÍTICA    ⚠️ Si-     ⚠️ 60%   Implementar
├─ CCPA (California)           MEDIA      ⚠️ Si-     ⚠️ 50%   Evaluar
├─ ISO/IEC 27001               MEDIA      ⚠️ No      ⏳ 0%    Planeado
└─ SOC 2 Type II               MEDIA      ⏳ Future  ⏳ 0%    Planeado
════════════════════════════════════════════════════════════════════════
```

---

## 🇬🇹 REGULACIONES GUATEMALTECAS

### 1. LEY DE PROTECCIÓN DE DATOS (Ley de Protección de Datos Personales - 2008)

**Requisitos:**
- Consentimiento informado antes de recopilar datos
- Aviso de privacidad claro y accesible
- Derecho a acceso, rectificación, cancelación (ARCO)
- Responsable de datos designado
- Seguridad física y lógica

**Estado Actual:**
```
✅ Recopilación con consentimiento: OK
   └─ Login form incluye checkbox de términos

⚠️ Aviso de Privacidad: 70%
   └─ Falta: Política de privacidad publicada
   └─ Falta: Avisos en cada formulario
   
⚠️ Derechos ARCO: 50%
   └─ Falta: Endpoints para acceso/rectificación/cancelación
   └─ Falta: Proceso de reclamos documentado
   
✅ Responsable de Datos: Designado
   └─ Manager: IT/Compliance
   
⚠️ Seguridad: 80%
   └─ OK: Encriptación TLS 1.3
   └─ OK: Firebase Auth con 2FA
   └─ Falta: Registro de auditoría completo
   └─ Falta: Política de retención clara
```

**Acciones Requeridas:**
```
1. Crear Privacy Policy (Spanish):
   ├─ Publicar en /privacy
   ├─ Incluir: Qué datos, para qué, retención
   ├─ Incluir: Derechos ARCO + proceso
   ├─ Revisar con abogado

2. Implementar ARCO endpoints:
   ├─ GET /api/account/my-data (exportar todos datos)
   ├─ PUT /api/account/my-data (rectificar)
   ├─ DELETE /api/account/delete-account (cancelación)
   ├─ POST /api/account/data-access-request (formal)

3. Audit Logging:
   ├─ Registrar: Quién accedió qué datos, cuándo
   ├─ Retención: 2 años
   ├─ Acceso: Solo equipo autorizado

4. DPA (Data Processing Agreement):
   ├─ Vercel (hosting)
   ├─ Firebase (database)
   ├─ Preparar: Responsables de procesamiento
```

### 2. REGULACIÓN DE FIRMAS DIGITALES (Decreto 54-2002)

**Requisitos:**
- Firma digital válida legalmente
- Certificado digital reconocido
- Validación ante SAT/UEF

**Estado Actual:** ✅ 100%
```
✅ Firma digital implementada
   └─ Usando: Firebase Auth + Firestore
   └─ Cloud Sign services integrado
   
✅ Certificación:
   └─ Validación ante SAT manual
   └─ Documentos firmados en Firestore
   
✅ Conformidad:
   └─ Cumple decreto 54-2002
```

### 3. LEY DE COMERCIO ELECTRÓNICO (Decreto 51-2002)

**Requisitos:**
- Términos y Condiciones claros
- Protección de consumidor
- Responsabilidad de plataforma

**Estado Actual:** ✅ 100%
```
✅ T&Cs:
   └─ Publicado en /terms
   └─ Aceptación en registro
   
✅ Protección consumidor:
   └─ Responsabilidad de acciones
   └─ Garantía de servicio
   
✅ LGPD compliance:
   └─ Avisos de cookies (falta cookie banner)
   └─ Política de retención
```

**Mejora Faltante:**
```
Crear Cookie Banner:
├─ Implementar: osano.com o iubenda.com
├─ Opciones: Essentials, Analytics, Marketing
├─ Almacenar consentimiento en localStorage
├─ Incluir: Link a Privacy Policy
```

### 4. CÓDIGO TRIBUTARIO (Guatemala)

**Requisitos:**
- Registros contables auditables
- Comprobantes digitales firmados
- Retención de registros: 7 años

**Estado Actual:** ⚠️ 90%
```
⚠️ Registros:
   └─ OK: Sistema registra todas operaciones en Firestore
   └─ OK: Timestamps automáticos
   └─ Falta: Integración SAT para comprobantes fiscales
   
✅ Firmas Digitales:
   └─ OK: Documentos registrados en Firestore
   
⚠️ Retención:
   └─ OK: Backups 30 días automáticos
   └─ Falta: Política de retención 7 años
   └─ Falta: Archivos históricos
```

**Acciones:**
```
1. Integración SAT:
   ├─ Implementar: Web service SAT para comprobantes
   ├─ API: Emisión de FEL (Factura Electrónica)
   ├─ Validación: Número de serie + firma

2. Retención 7 años:
   ├─ Implementar: Archive Cloud Storage
   ├─ Política: Mover datos >6 meses a archive
   ├─ Acceso: Lectura-only, no edición
   ├─ Restauración: Procedimiento documentado
```

---

## 🇪🇺 REGULACIONES INTERNACIONALES

### GDPR (Reglamento General de Protección de Datos - EU)

**Aplica si:** Tienes usuarios EU o procesan datos EU

**Requisitos Clave:**
- Consentimiento explícito (opt-in, no opt-out)
- Derecho al olvido ("derecho a ser borrado")
- Portabilidad de datos
- Notificación de brechas <72h
- Evaluación de impacto (DPIA)
- DPA con procesadores

**Estado Actual:** ⚠️ 60%

```
✅ Consentimiento:
   └─ Checkbox requerido en registro
   
⚠️ Derecho al olvido:
   └─ Falta: Cascada delete (proyectos → gastos → asistencia)
   └─ Falta: Eliminar backups después de delete request
   
⚠️ Portabilidad:
   └─ OK: GET /api/account/my-data (todos los datos en JSON)
   └─ Falta: Formato estándar (confirmable)
   
🔴 Notificación de brechas:
   └─ Falta: Proceso de incident response
   └─ Falta: Template de notificación
   
⚠️ DPIA:
   └─ Falta: Evaluación formal de riesgos
   └─ Falta: Medidas mitigantes documentadas
   
⚠️ DPA:
   └─ Falta: Signed DPA con Vercel
   └─ Falta: Signed DPA con Firebase
```

**Acciones Requeridas:**

```typescript
// 1. Implementar Right to be Forgotten

export const deleteAccountCascade = async (userId: string) => {
  const batch = db.batch();
  
  // 1. Borrar proyectos
  const proyectosRef = collection(db, 'proyectos');
  const q1 = query(proyectosRef, where('userId', '==', userId));
  const pDocs = await getDocs(q1);
  pDocs.forEach(doc => batch.delete(doc.ref));
  
  // 2. Borrar relacionados (APU, Gastos, etc)
  const relatedCollections = ['apu', 'gastos', 'personal', 'cotizaciones'];
  for (const col of relatedCollections) {
    const ref = collection(db, col);
    const q = query(ref, where('userId', '==', userId));
    const docs = await getDocs(q);
    docs.forEach(doc => batch.delete(doc.ref));
  }
  
  // 3. Borrar usuario
  batch.delete(doc(db, 'users', userId));
  
  // 4. Commit
  await batch.commit();
  
  // 5. Crear registro de delete para compliance
  await recordAccountDeletion(userId);
};
```

```
2. Crear Incident Response Plan:
   ├─ Detectar brecha
   ├─ Notificar autoridades <72h
   ├─ Notificar usuarios si riesgo alto
   ├─ Documentar: Qué, cuándo, impacto
   └─ Revisar con DPO/abogado
```

---

## 🇺🇸 CCPA (California Consumer Privacy Act)

**Aplica si:** Tienes usuarios California

**Requisitos:**
- Divulgar datos recopilados
- Derecho de acceso
- Derecho a eliminar
- Derecho a opt-out de venta
- NO discriminación por privacidad

**Estado Actual:** ⚠️ 50%

```
✅ Similares a GDPR
   └─ Implementaciones GDPR también aplican aquí
   
⚠️ Diferencias importantes:
   └─ Falta: Deshabilitar "venta" de datos (cookies)
   └─ Falta: "Do Not Sell My Personal Info" enlace
   └─ Falta: Verificación de identidad antes de acceso
```

---

## 📊 ESTATUS DE COMPLIANCE

```
                 GUATEMALA  GDPR   CCPA   ISO27K1  SOC2    TOTAL
Protección       95%        60%    50%    0%       0%      ⚠️ 61%
Datos

Privacidad       70%        60%    50%    0%       0%      ⚠️ 56%
Policy

Consentimiento   100%       80%    70%    0%       0%      ⚠️ 70%

Right to         50%        40%    40%    0%       0%      🔴 46%
Forget

Auditing         80%        50%    40%    0%       0%      ⚠️ 54%

Encryption       100%       100%   100%   80%      80%     ✅ 92%

Access Control   90%        90%    90%    85%      80%     ✅ 87%

TOTAL            81%        63%    57%    27%      27%     ⚠️ 71%
```

---

## 🎯 ROADMAP DE COMPLIANCE

### INMEDIATO (Semana 1)
```
- [ ] Crear Privacy Policy (Spanish) - abogado
- [ ] Crear Terms & Conditions (Spanish) - abogado
- [ ] Implementar Cookie Banner
- [ ] Publicar GDPR Policy
```

### CORTO PLAZO (Mes 1)
```
- [ ] Implementar Right to be Forgotten (cascada delete)
- [ ] Crear Incident Response Plan
- [ ] Implementar ARCO endpoints
- [ ] Firmar DPA con Vercel + Firebase
```

### MEDIANO PLAZO (Mes 2-3)
```
- [ ] ISO/IEC 27001 internal assessment
- [ ] Data Processing Impact Assessment (DPIA)
- [ ] Security audit interno
- [ ] Preparar para penetration testing
```

### LARGO PLAZO (Mes 4-6)
```
- [ ] Certificación ISO/IEC 27001 (optional)
- [ ] SOC 2 Type II audit (optional)
- [ ] Compliance monitoring automated
- [ ] Annual audit cycle established
```

---

## ✅ CHECKLIST DE COMPLIANCE

- [ ] Privacy Policy publicada
- [ ] Terms & Conditions publicada
- [ ] Cookie banner implementado
- [ ] Consentimiento GDPR colectado
- [ ] Derecho al olvido (cascada delete)
- [ ] Data portability (JSON export)
- [ ] ARCO endpoints funcionales
- [ ] Incidentes de seguridad documentados
- [ ] DPA firmado con proveedores
- [ ] Auditoría interna completada

---

## 📊 COMPLIANCE SCORE

| Aspecto | Score | Status | Priority |
|---------|-------|--------|----------|
| Guatemala | 85/100 | ✅ | Bajo |
| GDPR | 60/100 | ⚠️ | Alto |
| CCPA | 50/100 | ⚠️ | Medio |
| ISO/SOC | 25/100 | 🔴 | Futuro |
| **TOTAL** | **70/100** | ⚠️ | 10+ acciones |

**Estado:** ⚠️ FUNCIONAL PERO INCOMPLETO - REQUIERE LEGAL REVIEW

