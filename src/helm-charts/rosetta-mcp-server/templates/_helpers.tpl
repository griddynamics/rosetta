{{/*
Expand the name of the chart.
*/}}
{{- define "rosetta-mcp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "rosetta-mcp.fullname" -}}
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
{{- define "rosetta-mcp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "rosetta-mcp.labels" -}}
helm.sh/chart: {{ include "rosetta-mcp.chart" . }}
{{ include "rosetta-mcp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "rosetta-mcp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rosetta-mcp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "rosetta-mcp.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "rosetta-mcp.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Probe with port defaulted to the first container port name (port<N>) from .Values.ports
when the probe handler has no explicit port.
Usage: include "rosetta-mcp.probe" (dict "probe" $p "ports" $.Values.ports)
*/}}
{{- define "rosetta-mcp.probe" -}}
{{- $probe := deepCopy .probe -}}
{{- if .ports -}}
{{- $name := printf "port%v" (first .ports) -}}
{{- range $h := list "httpGet" "tcpSocket" -}}
{{- if hasKey $probe $h -}}
{{- $handler := get $probe $h | default dict -}}
{{- if not (hasKey $handler "port") -}}
{{- $_ := set $handler "port" $name -}}
{{- end -}}
{{- $_ := set $probe $h $handler -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- toYaml $probe -}}
{{- end }}

{{/*
ROSETTA_HTTP_PORT env entry derived from the first entry of .Values.ports, so the server listens on the
port the probes, Service and Ingress use. Renders nothing when .Values.ports is empty or when env.vars or
env.secrets already define ROSETTA_HTTP_PORT (the explicit value is kept and appears once).
*/}}
{{- define "rosetta-mcp.httpPortEnv" -}}
{{- $explicit := false -}}
{{- range concat (.Values.env.vars | default list) (.Values.env.secrets | default list) -}}
{{- if eq (toString .name) "ROSETTA_HTTP_PORT" -}}
{{- $explicit = true -}}
{{- end -}}
{{- end -}}
{{- if and .Values.ports (not $explicit) -}}
- name: ROSETTA_HTTP_PORT
  value: {{ first .Values.ports | toString | quote }}
{{- end -}}
{{- end }}
