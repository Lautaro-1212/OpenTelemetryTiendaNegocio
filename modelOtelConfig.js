const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes, METRIC_DOTNET_PROCESS_CPU_TIME } = require('@opentelemetry/semantic-conventions');
const { trace, context } = require('@opentelemetry/api');
const { default: axios } = require('axios');

class OtelConfig{

    constructor({ serviceName,  urlExporter }){

        if(urlExporter)
            process.env.OTEL_URL_EXPORTER = urlExporter;
        else if(!process.env.OTEL_URL_EXPORTER)
            process.env.OTEL_URL_EXPORTER = 'http://localhost:4318/v1/traces';

        const exporter = new OTLPTraceExporter({
          url: process.env.OTEL_URL_EXPORTER
        })

        if(serviceName) process.env.OTEL_SERVICE_NAME = serviceName;
        
        const sdk = new NodeSDK({
          resource:resourceFromAttributes({
            [SemanticResourceAttributes.SERVICE_NAME]:
            process.env.OTEL_SERVICE_NAME || 'unknown-service'
          }),
        
          traceExporter: exporter,
          instrumentations: [  
            getNodeAutoInstrumentations({ 
                // HTTP (Axios, fetch, requests entrantes)
              '@opentelemetry/instrumentation-http': {
                enabled: true,
                ignoreLayersType: ['middleware']
              },
        
              // Express
              '@opentelemetry/instrumentation-express': {
                enabled: false,
                ignoreLayersType:['middleware']
              },
        
              // DNS
              '@opentelemetry/instrumentation-dns': {
                enabled: false
              },
        
              // FS
              '@opentelemetry/instrumentation-fs': {
                enabled: false
              },
        
              // Net
              '@opentelemetry/instrumentation-net': {
                enabled: false
              }
            })
          ]
        })
        
        console.log("Exporter:", exporter);
        
        try{
          sdk.start()
          console.log("OTel iniciado")
        }catch(err){
          console.error("Error iniciando OTel:", err)
        }

        this.tracer = null;
    }

    createTrace(name){
        this.tracer = trace.getTracer(name);
    }

    createSpan(name){
        return this.tracer.startSpan(name, undefined, context.active());
    }

    createCtx(span){
      return trace.setSpan(context.active(), span)
    }

    passContext(ctx, puerto, servicio){
      context.with(ctx, async () =>{
        await axios.post(`http://localhost:${puerto}/${servicio}`)
      })
    }
}

module.exports = OtelConfig;