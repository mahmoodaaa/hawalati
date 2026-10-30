FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
# The developer's local application.properties is excluded from the build context.
COPY docker/application.properties ./src/main/resources/application.properties
RUN mvn -B -ntp -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 hawalati \
    && useradd --uid 10001 --gid hawalati --no-create-home hawalati \
    && mkdir -p /app/documents && chown -R hawalati:hawalati /app
WORKDIR /app
COPY --from=build --chown=hawalati:hawalati /build/target/hawalati-backend-0.0.1-SNAPSHOT.jar app.jar
USER hawalati
EXPOSE 7171
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 CMD curl -fsS http://127.0.0.1:7171/v3/api-docs > /dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-jar", "app.jar"]
