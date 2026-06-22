export function parseSseBlock(block) {
  let event = 'message';
  const dataLines = [];

  block.split(/\r?\n/).forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  });

  if (!dataLines.length) return null;

  try {
    return {
      event,
      payload: JSON.parse(dataLines.join('\n')),
    };
  } catch {
    return null;
  }
}

export function createSseParser(onEvent) {
  let buffer = '';

  function consumeBlock(block) {
    const parsed = parseSseBlock(block);
    if (parsed) onEvent(parsed.event, parsed.payload);
  }

  return {
    push(chunk) {
      buffer += chunk;
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() || '';
      parts.forEach(consumeBlock);
    },
    flush() {
      if (buffer.trim()) consumeBlock(buffer);
      buffer = '';
    },
  };
}
