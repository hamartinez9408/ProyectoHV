# Guía de Referencia: Manejo Centralizado de Excepciones y RFC 9457 en Spring Boot

## 1. Principio Fundamental
Las APIs REST de ProyectoHV implementan el estándar **RFC 9457 (Problem Details for HTTP APIs)** utilizando la clase nativa `ProblemDetail` de Spring 6 / Spring Boot 3+.

- **Prohibido**: Retornar `null`, mapas genéricos `Map<String, Object>`, cadenas con mensajes de error no estructurados o códigos mágicos de estado en el payload.
- **Prohibido**: Exponer trazas de stack (`e.printStackTrace()`) o excepciones internas de SQL/infraestructura al cliente.

## 2. Jerarquía de Excepciones de Dominio
Toda excepción de negocio hereda de una excepción base de dominio:

```java
package com.harold.proyectohv.access.domain.exception;

public abstract class DomainException extends RuntimeException {
    protected DomainException(String message) {
        super(message);
    }
    protected DomainException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### Ejemplos Semánticos Específicos:
```java
// Lanzada cuando el token ha superado las 48 horas o el límite de 2 extensiones
public class MagicLinkExpiradoException extends DomainException {
    public MagicLinkExpiradoException(String token) {
        super("El enlace de acceso ha expirado o ya ha consumido sus extensiones permitidas.");
    }
}

// Lanzada cuando el dominio no posee registros DNS MX válidos
public class DominioSinRegistrosMxException extends DomainException {
    public DominioSinRegistrosMxException(String domain) {
        super("El dominio '" + domain + "' no posee servidores de correo (MX) válidos o no es corporativo.");
    }
}
```

## 3. Manejador Global Centralizado (`@RestControllerAdvice`)
Ubicado en `infrastructure/adapter/in/rest/exception/GlobalExceptionHandler.java`:

```java
package com.harold.proyectohv.access.infrastructure.adapter.in.rest.exception;

import com.harold.proyectohv.access.domain.exception.DomainException;
import com.harold.proyectohv.access.domain.exception.DominioSinRegistrosMxException;
import com.harold.proyectohv.access.domain.exception.MagicLinkExpiradoException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.java);

    // 1. Manejo de Magic Link Expirado (HTTP 410 Gone / 401 Unauthorized)
    @ExceptionHandler(MagicLinkExpiradoException.class)
    public ProblemDetail handleMagicLinkExpirado(MagicLinkExpiradoException ex) {
        log.warn("Acceso denegado: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.GONE, ex.getMessage());
        problem.setTitle("Enlace de Acceso Expirado");
        problem.setType(URI.create("https://proyectohv.dev/errors/magic-link-expirado"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errorCode", "ACCESS_LINK_EXPIRED");
        return problem;
    }

    // 2. Manejo de Dominio Inválido o sin MX (HTTP 422 Unprocessable Entity)
    @ExceptionHandler(DominioSinRegistrosMxException.class)
    public ProblemDetail handleDominioInvalido(DominioSinRegistrosMxException ex) {
        log.warn("Dominio no corporativo o sin MX: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Dominio Corporativo Inválido");
        problem.setType(URI.create("https://proyectohv.dev/errors/invalid-mx-domain"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errorCode", "DOMAIN_MX_NOT_FOUND");
        return problem;
    }

    // 3. Manejo de Validación Declarativa (@Valid / Bean Validation) -> HTTP 400
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST,
            "La solicitud contiene datos de entrada inválidos o faltantes."
        );
        problem.setTitle("Error de Validación de Entrada");
        problem.setType(URI.create("https://proyectohv.dev/errors/validation-error"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errorCode", "VALIDATION_FAILED");
        problem.setProperty("invalidFields", fieldErrors);
        return problem;
    }

    // 4. Captura Segura de Fallos Inesperados -> HTTP 500 (Sin fugar stack trace)
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception ex) {
        log.error("Error no controlado en el servidor", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Ha ocurrido un error inesperado al procesar la solicitud. El incidente ha sido registrado."
        );
        problem.setTitle("Error Interno del Servidor");
        problem.setType(URI.create("https://proyectohv.dev/errors/internal-server-error"));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errorCode", "INTERNAL_SERVER_ERROR");
        return problem;
    }
}
```
