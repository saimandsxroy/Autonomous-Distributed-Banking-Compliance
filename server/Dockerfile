# Multi-stage production build for FourEyes Core Banking Engine
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY src src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app
RUN addgroup -S foureyes && adduser -S foureyes -G foureyes
USER foureyes
COPY --from=builder /workspace/target/*.jar app.jar
EXPOSE 8081
ENV PORT=8081
ENTRYPOINT ["java", "-XX:+EnableDynamicAgentLoading", "-XX:+UseZGC", "-jar", "app.jar"]
