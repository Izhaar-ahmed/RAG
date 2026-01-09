import networkx as nx
import json
import os
from typing import List, Dict, Any, Tuple
from llama_cpp import Llama

class LocalGraphStore:
    def __init__(self, graph_path: str = "models/knowledge_graph.json"):
        self.graph = nx.Graph()
        self.graph_path = graph_path
        self.load()

    def add_block_node(self, block_id: str, metadata: Dict[str, Any] = None):
        """Adds a Block Node (Section)."""
        # Ensure metadata values are safe for NetworkX (some versions dislike complex types as attributes if used for filtering)
        # But mostly to prevent errors/warnings.
        safe_meta = {}
        if metadata:
            for k, v in metadata.items():
                if isinstance(v, (list, dict)):
                    safe_meta[k] = str(v)
                else:
                    safe_meta[k] = v
        self.graph.add_node(str(block_id), type="block", **safe_meta)

    def add_entity_node(self, entity_id: str, metadata: Dict[str, Any] = None):
        """Adds an Entity Node (Term)."""
        # Sanitize entity_id to be string, just in case LLM returns a list/obj as "head"
        safe_id = str(entity_id)
        if not self.graph.has_node(safe_id):
            safe_meta = {}
            if metadata:
                for k, v in metadata.items():
                    if isinstance(v, (list, dict)):
                        safe_meta[k] = str(v)
                    else:
                        safe_meta[k] = v
            self.graph.add_node(safe_id, type="entity", **safe_meta)

    def add_relationship(self, source: str, target: str, relation: str):
        """Adds an edge between two nodes."""
        self.graph.add_edge(str(source), str(target), relation=str(relation))

    def get_contextual_subgraph(self, block_ids: List[str]) -> str:
        """
        Retrieves the specified Block nodes and all connected Entity/Relationship nodes.
        Returns a text summary of the connections.
        """
        subgraph_nodes = set(block_ids)

        # 1. Find entities connected to these blocks
        for block_id in block_ids:
            if self.graph.has_node(block_id):
                neighbors = self.graph.neighbors(block_id)
                for neighbor in neighbors:
                    if self.graph.nodes[neighbor].get("type") == "entity":
                        subgraph_nodes.add(neighbor)

        # 2. Find connections between these entities (2nd order)
        # We only care about edges between the collected entities
        # or between a collected entity and ANOTHER block if we wanted to expand,
        # but the requirement says "hidden connections between these blocks".
        
        # So, if Block 1 -> "Acme" and Block 2 -> "Acme", "Acme" is the bridge.
        # We want to highlight "Acme".
        
        relevant_entities = []
        for n in subgraph_nodes:
            if self.graph.has_node(n) and self.graph.nodes[n].get("type") == "entity":
                relevant_entities.append(n)
        
        # Check for shared entities
        summary_lines = []
        
        for entity in relevant_entities:
            connected_blocks = []
            for neighbor in self.graph.neighbors(entity):
                if neighbor in block_ids:
                    connected_blocks.append(neighbor)
            
            if len(connected_blocks) > 1:
                 # This entity connects multiple retrieved blocks!
                 summary_lines.append(f"Common Entity '{entity}' connects blocks: {', '.join(connected_blocks)}")
            else:
                 # Just mentioned in one block
                 # We can list simple relations too
                 pass
                 
        # Also include direct relationships between entities if relevant?
        # "Entity A --[RELATED_TO]--> Entity B"
        # If both A and B are in relevant_entities
        for i, e1 in enumerate(relevant_entities):
            for e2 in relevant_entities[i+1:]:
                if self.graph.has_edge(e1, e2):
                    rel = self.graph.get_edge_data(e1, e2).get("relation", "related to")
                    summary_lines.append(f"'{e1}' is {rel} '{e2}'")

        if not summary_lines:
            return ""

        return "Graph Connections:\n- " + "\n- ".join(summary_lines)

    def save(self):
        """Persist graph to JSON."""
        data = nx.node_link_data(self.graph)
        os.makedirs(os.path.dirname(self.graph_path), exist_ok=True)
        with open(self.graph_path, 'w') as f:
            json.dump(data, f)
        print(f"Graph saved to {self.graph_path} with {self.graph.number_of_nodes()} nodes.")

    def load(self):
        """Load graph from JSON."""
        if os.path.exists(self.graph_path):
            with open(self.graph_path, 'r') as f:
                data = json.load(f)
            self.graph = nx.node_link_graph(data)
            print(f"Graph loaded from {self.graph_path} with {self.graph.number_of_nodes()} nodes.")
        else:
            print("No existing graph found. created new one.")

class BlockGraphBuilder:
    def __init__(self, llm_client: Llama):
        self.llm = llm_client

    def process_block(self, block_id: str, block_text: str) -> List[Tuple[str, str, str]]:
        """
        Send block_text to Phi-3 LLM.
        Prompt: "Extract key Entities (People, Orgs, Terms) and Relationships."
        Output: List of Tuples (Entity, Relation, Target_Entity).
        """
        if not self.llm:
            return []

        # Prompt Engineering
        # Phi-3 is small, so we need a very structured prompt.
        system_prompt = """You are a knowledge graph extractor. Extract key entities (People, Organizations, Technical Terms) and their relationships from the text.
Format your output as a list of JSON objects: [{"head": "Entity1", "relation": "relationship", "tail": "Entity2"}, ...]
Only output the JSON list. Do not explain."""

        user_prompt = f"Text:\n{block_text[:2000]}...\n\nExtract relationships:" # Truncate if too long
        
        full_prompt = f"<|user|>\n{system_prompt}\n\n{user_prompt}<|end|>\n<|assistant|>"

        try:
            output = self.llm(
                full_prompt, 
                max_tokens=512, 
                stop=["<|end|>", "User Question:", "\n\n\n"], 
                echo=False,
                temperature=0.1 # Low temp for deterministic format
            )
            text_output = output['choices'][0]['text'].strip()
            
            # Simple parsing attempt
            # The model might output markdown code blocks
            clean_text = text_output.replace("```json", "").replace("```", "").strip()
            
            # Find the first [ and last ]
            start_idx = clean_text.find("[")
            end_idx = clean_text.rfind("]")
            
            triplets = []
            if start_idx != -1 and end_idx != -1:
                json_str = clean_text[start_idx:end_idx+1]
                data = json.loads(json_str)
                for item in data:
                    if "head" in item and "relation" in item and "tail" in item:
                        triplets.append((item["head"], item["relation"], item["tail"]))
            
            return triplets

        except Exception as e:
            print(f"Error parsing graph output for block {block_id}: {e}")
            # print(f"Raw output: {text_output}")
            return []
