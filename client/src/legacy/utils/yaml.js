import YAML from 'yaml';

export function toYamlString(configObject) {
  return YAML.stringify(configObject);
}
