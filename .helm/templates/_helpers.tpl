{{/*
Expand the name of the chart.
*/}}
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "my-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- range $key, $value := .Values.labels }}
{{ $key }}: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
Selector labels (primary deployment; FR-009: component for observability)
*/}}
{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: primary
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "my-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "my-app.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the config map
*/}}
{{- define "my-app.configMapName" -}}
{{- printf "%s-config" (include "my-app.fullname" .) }}
{{- end }}

{{/*
Generate environment variables from config
*/}}
{{- define "my-app.envVars" -}}
- name: APP_ENV
  value: {{ .Values.config.env | quote }}
- name: LOG_LEVEL
  value: {{ .Values.config.logLevel | quote }}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
{{- range $key, $value := .Values.config.additionalVars }}
- name: {{ $key | upper }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
Workload-scoped fullname (multi-workload mode).
Input: dict with "ctx" (root context) and "name" (workload name, map key).
Output: Release.Name-workloadName, truncated to 63 chars, no trailing hyphen.
*/}}
{{- define "workload.fullname" -}}
{{- $ctx := .ctx -}}
{{- $name := .name -}}
{{- printf "%s-%s" $ctx.Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/*
Workload-scoped labels (FR-009: identifiable in logs/metrics).
Input: dict with "ctx" (root context) and "name" (workload name).
*/}}
{{- define "workload.labels" -}}
{{- $ctx := .ctx -}}
{{- $name := .name -}}
helm.sh/chart: {{ include "my-app.chart" $ctx | quote }}
app.kubernetes.io/name: {{ $ctx.Chart.Name | quote }}
app.kubernetes.io/component: {{ $name | quote }}
app.kubernetes.io/instance: {{ $ctx.Release.Name | quote }}
{{- if $ctx.Chart.AppVersion }}
app.kubernetes.io/version: {{ $ctx.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ $ctx.Release.Service | quote }}
{{- end }}

{{/*
Workload-scoped selector labels (for Deployment selector and Service).
*/}}
{{- define "workload.selectorLabels" -}}
{{- $ctx := .ctx -}}
{{- $name := .name -}}
app.kubernetes.io/name: {{ $ctx.Chart.Name | quote }}
app.kubernetes.io/instance: {{ $ctx.Release.Name | quote }}
app.kubernetes.io/component: {{ $name | quote }}
{{- end }}

{{/*
Environment variables for a workload (multi-workload mode).
Input: dict with "ctx" (root context) and "w" (workload values object).
Uses w.config with fallback to ctx.Values.config.
*/}}
{{- define "workload.envVars" -}}
{{- $ctx := .ctx -}}
{{- $w := .w -}}
{{- $config := $w.config | default $ctx.Values.config | default dict -}}
- name: APP_ENV
  value: {{ ($config.env | default "production") | quote }}
- name: LOG_LEVEL
  value: {{ ($config.logLevel | default "info") | quote }}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_IP
  valueFrom:
    fieldRef:
      fieldPath: status.podIP
{{- $config := $w.config | default $ctx.Values.config | default dict -}}
{{- with $config.additionalVars }}
{{- range $key, $value := . }}
- name: {{ $key | upper }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Generate image pull secret
*/}}
{{- define "my-app.imagePullSecret" -}}
{{- if .Values.image.registryCredentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .Values.image.registryCredentials.registry .Values.image.registryCredentials.username .Values.image.registryCredentials.password .Values.image.registryCredentials.email (printf "%s:%s" .Values.image.registryCredentials.username .Values.image.registryCredentials.password | b64enc) | b64enc }}
{{- end }}
{{- end }}
