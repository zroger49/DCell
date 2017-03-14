import { createAction } from 'redux-actions'
import {Client} from 'elasticsearch'

import config from '../assets/config.json'



const client = new Client({
  host: config.backendServices.db,
  log: 'info'
});


export const RUN_SIMULATION = 'RUN_SIMULATION'

const runSimulation = (serviceUrl, genes) => {

  return {
    type: RUN_SIMULATION,
    serviceUrl,
    genes
  }
}


export const RECEIVE_SIMULATION_RESULT = 'RECEIVE_SIMULATION_RESULT'
const receiveSimulationResult = (serviceUrl, genes, json) => {

  return {
    type: RECEIVE_SIMULATION_RESULT,
    serviceUrl,
    genes,
    result: json
  }
}

export const FETCH_CHILDREN = 'FETCH_CHILDREN'

const fetchChildren = (serviceUrl, termId) => {

  return {
    type: FETCH_CHILDREN,
    serviceUrl,
    pivot: termId,
  }
}

export const RECEIVE_CHILDREN = 'RECEIVE_CHILDREN'
const receiveChildren = (serviceUrl, json, pivot) => {

  return {
    type: RECEIVE_SIMULATION_RESULT,
    serviceUrl,
    pivot,
    result: json
  }
}


const fetchResult = (serviceUrl, genes) => {

  const query = genes

  console.log('-----------------Calling')

  const params = {
    method: 'POST',
    body: JSON.stringify(query)
  }

  console.log(params)

  return fetch(serviceUrl, params)
}


export const pivot = (currentDag, serviceUrl, termId) => {
  return dispatch => {

    dispatch(fetchChildren(serviceUrl, termId))

    const url = serviceUrl + termId + '/children'

    return fetch(url)
      .then(response => (response.json()))
      .then(json => {

        const nodes = json.elements.nodes
        const edges = json.elements.edges

        nodes.forEach(n => {
          console.log(n)
          if(n.id !== termId) {
            currentDag.data.nodes.push({
              id: n.data.id,
              name: n.data.name,
              importance: -1,
              phenotype: -1,
              neutons: [],
              namespace: ''
            })
          }
        })

        edges.forEach(e=> {
          console.log(e)
          currentDag.data.edges.push({
            source: e.data.source,
            target: e.data.target
          })
        })

        return dispatch(receiveChildren(serviceUrl, currentDag, termId))
      })
  }

}

export const runDeletion = (serviceUrl, genes, geneMap) => {

  return dispatch => {
    dispatch(runSimulation(serviceUrl, genes))

    return fetchResult(serviceUrl, genes)
      .then(response => {
        console.log(response)
        return response.json()
      })
      .then(json => {
        console.log('got DAG json in cyjs format')
        console.log(json)

        const nodes = json.data.nodes
        const nodeIds = nodes.map(node => {
          return node.id
        })

        console.log("IDS:")
        console.log(nodeIds)

        searchIdMapping(nodeIds)
          .then(res2 => {
            console.log('got new res2')
            console.log(res2)

            const docs = res2.docs
            const result = replaceNodeData(nodes, docs, genes, geneMap)

          })
          .then(json2 => {
            console.log(json2)

            return dispatch(receiveSimulationResult(serviceUrl, genes, json))
          })
      })
  }
}

const replaceNodeData = (nodes, docs, genes, geneMap) => {

  const mapping = {}

  docs.forEach(entry => {

    if(entry['found']) {
      mapping[entry._id] = {
        name: entry._source.name,
        namespace: entry._source.namespace
      }
    }
  })


  genes.forEach(gene => {
    mapping[gene] = geneMap[gene]
  })


  console.log("MAP-_________________________________")
  console.log(mapping)

  return nodes.map(node => {
    const data = mapping[node.id]

    if(data !== undefined) {
      node.name = data.name
      node.namespace = data.namespace
    } else {
      node.name = node.id
      node.namespace = "N/A"
    }

    return node
  })
}

const mergeGraph = (serviceUrl, termid) => {

  const url = serviceUrl + termid + '/children'

  return fetch(url)

}


const searchIdMapping = query => {

  return client.mget(
    {
      index: 'terms',
      type: 'go_term',
      _source: ['name', 'namespace'],
      body: {
        ids: query
      }
    }
  )
}

export const ADD_GENE = 'ADD_GENE'
export const addGene = createAction(ADD_GENE)

export const DELETE_GENE = 'DELETE_GENE'
export const deleteGene = createAction(DELETE_GENE)

export const CLEAR_GENES = 'CLEAR_GENES'
export const clearGenes = createAction(CLEAR_GENES)

export const CLEAR_RESULTS = 'CLEAR_RESULTS'
export const clearResults = createAction(CLEAR_RESULTS)