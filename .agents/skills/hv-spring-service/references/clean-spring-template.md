# Plantilla de Microservicio Java 21 Spring Boot (Clean / Hexagonal)

## Estructura de Paquetes
```
services/<service-name>/src/main/java/com/harold/proyectohv/<service-name>/
├── domain/                  # Lógica pura de negocio (POJOs, Records, Interfaces)
│   ├── model/               # Entidades y Value Objects (inmutables)
│   ├── exception/           # Excepciones de dominio
│   └── port/
│       ├── in/              # Casos de uso (Interfaces primarias)
│       └── out/             # Puertos de salida (Repositorios, Mensajería, DNS)
├── application/             # Orquestación de casos de uso
│   ├── usecase/             # Implementación de puertos de entrada
│   └── dto/                 # Request/Response DTOs inmutables (Records)
└── infrastructure/          # Adaptadores secundarios y frameworks
    ├── adapter/
    │   ├── in/rest/         # @RestController y mapeo de errores
    │   ├── out/persistence/ # Repositorios Spring Data JPA / Supabase client
    │   ├── out/messaging/   # RabbitMQ Producers / Consumers
    │   └── out/dns/         # Adaptador de resolución MX
    └── config/              # Bean configurations, Security, Redis Cache
```

## Patrón de Validación de Dominio Corporativo (DNS MX)
```java
public boolean hasValidMxRecord(String domain) {
    try {
        Hashtable<String, String> env = new Hashtable<>();
        env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
        DirContext ictx = new InitialDirContext(env);
        Attributes attrs = ictx.getAttributes(domain, new String[] { "MX" });
        Attribute attr = attrs.get("MX");
        return attr != null && attr.size() > 0;
    } catch (NamingException e) {
        return false;
    }
}
```
