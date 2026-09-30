# Modelo de costos

> **Fase:** 1 · Planificación
>
> **Decisión humana**
> - **Qué decidió Harold:** buscar costo cercano a cero y diversificar en muchas
>   tecnologías para evidenciar el stack de la hoja de vida.
> - **Qué ejecutó la IA:** verificación de las cuotas vigentes **contra fuentes**,
>   y detección de tres supuestos obsoletos que habrían llevado a una decisión
>   equivocada.
> - **Alternativas descartadas:** self-hosted runner como estrategia de costo cero
>   (dejó de ser gratis el 1-mar-2026 — ver `03-estrategia-devops.md` §6).

---

## 1. Objetivo

**< USD 3/mes**, con la mayor parte del sistema en capa gratuita permanente.

---

## 2. Costos por componente

| Componente | Capa gratuita | Límite real | Costo |
|---|---|---|---|
| **Netlify** (frontend) | Permanente | 100 GB/mes, 300 min de build | $0 |
| **Supabase** | Permanente | 500 MB BD · 5 GB egress · 500 k invocaciones Edge · 50 k MAU · 2 proyectos | $0 |
| **AWS Lambda** | **Permanente** | 1 M requests + 400 000 GB-s/mes (x86 y arm64) | $0 |
| **API Gateway** (HTTP) | 12 meses | ~$1 por millón de requests después | ~$0 |
| **Oracle Cloud** | Always Free | **2 OCPU / 12 GB ARM** + 200 GB · 2 VMs AMD micro | $0 |
| **MongoDB Atlas M0** | Permanente | 512 MB | $0 |
| **Resend** (correo) | Permanente | 3 000/mes, **100/día**, 1 dominio | $0 |
| **GitHub Actions** | **Repo público** | Minutos **ilimitados** | $0 |
| **GHCR** (imágenes) | Repo público | Sin costo | $0 |
| **Grafana Cloud** | Permanente | 10 k series, 50 GB logs, 14 días | $0 |
| **Sentry** | Permanente | 5 k errores/mes | $0 |
| LLM del RAG | Por uso | Depende del proveedor | ~$0–2 |

**Total estimado: < USD 3/mes.**

---

## 3. 🔴 Tres supuestos obsoletos — verificados

Estos tres datos se habrían dado por ciertos de memoria, y **los tres están
desactualizados**. Se verificaron con fuente antes de diseñar sobre ellos.

### 3.1 Oracle recortó su capa gratuita a la mitad

| | Antes | **Ahora** |
|---|---|---|
| Ampere A1 OCPU-h/mes | 3 000 | **1 500** |
| Ampere A1 GB-h/mes | 18 000 | **9 000** |
| Equivalente encendido 24/7 | 4 OCPU / 24 GB | **2 OCPU / 12 GB** |

Cambio efectivo el **15-jun-2026, sin anuncio público**. Las instancias por encima
del nuevo límite fueron **terminadas después del 18-ago-2026**.

*Fuentes: documentación de Always Free de OCI · InfoQ (jul-2026) · Linuxiac.*

**Impacto:** sigue siendo el mejor host gratuito para microservicios Java, pero
2 OCPU / 12 GB — no 4/24. Suficiente para 3 contenedores Spring Boot.

### 3.2 Supabase free pausa por inactividad y no tiene backups

- **Pausa a los 7 días sin actividad** y requiere despausar **a mano** desde el dashboard
- **Retención de backups: 0 días**
- Auth Audit Logs: **1 hora** de retención
- **No incluye** "Session timeouts" ni "Single session per user"

*Fuentes: docs de Supabase (rate limits, SMTP) · página de precios.*

**Impacto en el diseño — tres consecuencias directas:**
1. El sitio público **no depende** de Supabase: el contenido se sirve estático
2. El **TTL de 48 h se impone con RLS propia**, no con los ajustes de sesión
3. Cron de keep-alive + **el contenido vive en git**, que es el respaldo real

### 3.3 Los runners self-hosted dejaron de ser gratis

Desde el **1-mar-2026**, GitHub cobra **$0.002/min** por runners self-hosted en
repos privados. **Los repos públicos siguen siendo gratuitos** (hosted y self-hosted).

*Fuente: changelog oficial de GitHub Actions (dic-2025).*

**Impacto:** el repositorio es **público** → minutos ilimitados en GitHub-hosted.
Y eso obliga a que el contenido privado **no se commitee** (ver `.gitignore`).

---

## 4. El correo: bloqueante del flujo de acceso

El SMTP integrado de Supabase **no sirve** para este caso:

> *"Unless you configure a custom SMTP server, Supabase Auth **will refuse to
> deliver messages to addresses that are not part of the project's team**."*
> Límite: **2 mensajes/hora**.

Un reclutador **no es parte del equipo**, así que su dirección se rechaza por diseño.
No es un límite de volumen: es un límite de destinatarios.

**Solución:** SMTP propio con Resend (3 000/mes, 100/día, gratis). Al activarlo,
Supabase eleva su tope propio a 30/hora.

*Fuentes: docs de Supabase (auth-smtp, rate-limits) · precios de Resend.*

---

## 5. Qué rompería el "costo cero"

| Trampa | Costo si se activa |
|---|---|
| **NAT Gateway** en AWS | ~USD 32/mes — nunca conectar Lambda a VPC |
| **RDS / Aurora** | Desde USD 15/mes — usar Supabase |
| **ALB** | ~USD 16/mes — usar API Gateway o Cloudflare |
| **CloudWatch Logs** sin retención | Crece sin techo — fijar retención a 7 días |
| **Provisioned Concurrency** en Lambda | No es elegible para capa gratuita |
| **Supabase Pro** | USD 25/mes — solo si se necesita no pausar y backups |
| **Oracle por encima del límite** | Facturación real; instancias terminadas |
| **Repo privado** | Consume minutos de Actions ($0.002/min self-hosted) |

---

## 6. Presupuesto de correo

El cuello de botella real es **Resend: 100 correos/día**.

| Flujo | Correos | Nota |
|---|---|---|
| Solicitud de acceso | 1 | Magic link |
| Extensión (tope 2) | ≤2 | Uno por extensión |
| Aviso de vencimiento | 1 | Job nocturno |
| Notificación a Harold | 1 | Por evento |

→ **~25 solicitudes/día** antes de agotar la cuota. Muy por encima de lo esperable
para un portafolio, pero el **rate limit por IP y por correo es obligatorio**:
sin él, el endpoint es un cañón de spam y quema el dominio.

---

## 7. Decisión humana

- **Qué decidió Harold:** el conjunto de proveedores y priorizar amplitud de
  tecnologías sobre simplicidad.
- **Qué ejecutó la IA:** la verificación de cada cuota contra fuente, y la
  detección de los tres supuestos obsoletos de §3.
- **Lo que se decidió NO hacer:** aprovisionar RDS, NAT Gateway o un clúster de
  Kubernetes — añaden costo fijo sin aportar evidencia nueva al portafolio.
