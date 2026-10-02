# Dockerfile para Jenkins Controller con JCasC preinstalado para ProyectoHV
FROM jenkins/jenkins:lts-jdk21

# Deshabilitar setup wizard gráfico (adopta JCasC como fuente única de verdad)
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG="/var/jenkins_home/casc_configs/jenkins.yaml"

# Instalar plugins estándar requeridos por ProyectoHV
RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    workflow-aggregator \
    git \
    sonar \
    ansicolor \
    junit \
    jacoco \
    docker-workflow \
    pipeline-stage-view

# Copiar configuración como código
COPY jenkins.yaml /var/jenkins_home/casc_configs/jenkins.yaml
