# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -B dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -B -DskipTests package \
    && mv target/forge-backend-*.jar target/app.jar \
    && java -Djarmode=tools -jar target/app.jar extract --layers --destination /layers

FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S forge && adduser -S forge -G forge
WORKDIR /app
COPY --from=build /layers/dependencies/ ./
COPY --from=build /layers/spring-boot-loader/ ./
COPY --from=build /layers/snapshot-dependencies/ ./
COPY --from=build /layers/application/ ./
USER forge
EXPOSE 8080
# Configuration comes from the environment: DB_URL, DB_USER, DB_PASSWORD, APP_FRONTEND_ORIGIN, COOKIE_SECURE, COOKIE_SAME_SITE.
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
    CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
