/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Tiny dependency-free JSON helper used by the multiplayer layer. Only the
 * small subset of JSON needed by NetProtocol is supported: string, int, and
 * nested object/array serialization plus a lenient reader. NetMessage extends
 * LinkedHashMap so parsed nested objects are themselves NetMessages.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class NetMessage extends LinkedHashMap<String, Object> {

	public static NetMessage create(String type) {
		NetMessage m = new NetMessage();
		m.put(NetProtocol.FIELD_TYPE, type);
		return m;
	}

	public NetMessage put(String key, Object value) {
		super.put(key, value);
		return this;
	}

	public String type() {
		Object t = get(NetProtocol.FIELD_TYPE);
		return t == null ? null : t.toString();
	}

	public String str(String key) {
		Object v = get(key);
		return v == null ? null : v.toString();
	}

	public int num(String key) {
		Object v = get(key);
		if (v instanceof Number) return ((Number) v).intValue();
		if (v instanceof String) {
			try { return Integer.parseInt((String) v); } catch (Exception e) { return 0; }
		}
		return 0;
	}

	public boolean bool(String key) {
		Object v = get(key);
		return v instanceof Boolean && (Boolean) v;
	}

	@SuppressWarnings("unchecked")
	public List<NetMessage> list(String key) {
		Object v = get(key);
		if (!(v instanceof List)) return new ArrayList<>();
		List<Object> raw = (List<Object>) v;
		List<NetMessage> result = new ArrayList<>();
		for (Object o : raw) {
			if (o instanceof NetMessage) result.add((NetMessage) o);
		}
		return result;
	}

	public String toJSON() {
		StringBuilder sb = new StringBuilder();
		sb.append('{');
		boolean first = true;
		for (Map.Entry<String, Object> e : entrySet()) {
			if (!first) sb.append(',');
			first = false;
			sb.append(quote(e.getKey())).append(':').append(value(e.getValue()));
		}
		sb.append('}');
		return sb.toString();
	}

	private static String value(Object v) {
		if (v == null) return "null";
		if (v instanceof String) return quote((String) v);
		if (v instanceof NetMessage) return ((NetMessage) v).toJSON();
		if (v instanceof List) {
			StringBuilder sb = new StringBuilder("[");
			boolean first = true;
			for (Object o : (List<?>) v) {
				if (!first) sb.append(',');
				first = false;
				sb.append(value(o));
			}
			return sb.append(']').toString();
		}
		return v.toString();
	}

	private static String quote(String s) {
		StringBuilder sb = new StringBuilder("\"");
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			switch (c) {
				case '"':  sb.append("\\\""); break;
				case '\\': sb.append("\\\\"); break;
				case '\n': sb.append("\\n");  break;
				case '\r': sb.append("\\r");  break;
				case '\t': sb.append("\\t");  break;
				default:   sb.append(c);
			}
		}
		return sb.append('"').toString();
	}

	// ─── Lenient JSON parser ─────────────────────────────────────────────────

	public static NetMessage parse(String json) {
		if (json == null) return new NetMessage();
		Object root = parseValue(json.trim(), new int[]{0});
		if (root instanceof NetMessage) return (NetMessage) root;
		return new NetMessage();
	}

	@SuppressWarnings("unchecked")
	private static Object parseValue(String s, int[] i) {
		while (i[0] < s.length() && Character.isWhitespace(s.charAt(i[0]))) i[0]++;
		if (i[0] >= s.length()) return null;

		char c = s.charAt(i[0]);
		if (c == '{') return parseObject(s, i);
		if (c == '[') return parseArray(s, i);
		if (c == '"') return parseString(s, i).toString();
		if (c == 't' || c == 'f') return parseBool(s, i);
		if (c == 'n') { i[0] += 4; return null; }
		return parseNumber(s, i);
	}

	@SuppressWarnings("unchecked")
	private static NetMessage parseObject(String s, int[] i) {
		NetMessage map = new NetMessage();
		i[0]++; // skip {
		while (i[0] < s.length()) {
			while (i[0] < s.length() && (s.charAt(i[0]) == ',' || Character.isWhitespace(s.charAt(i[0])) || s.charAt(i[0]) == '}'))
				i[0]++;
			if (i[0] >= s.length() || s.charAt(i[0]) == '}') { i[0]++; break; }
			String key = parseString(s, i).toString();
			while (i[0] < s.length() && s.charAt(i[0]) != ':') i[0]++;
			i[0]++; // skip :
			Object val = parseValue(s, i);
			map.put(key, val);
		}
		return map;
	}

	private static List<Object> parseArray(String s, int[] i) {
		List<Object> list = new ArrayList<>();
		i[0]++; // skip [
		while (i[0] < s.length()) {
			while (i[0] < s.length() && (s.charAt(i[0]) == ',' || Character.isWhitespace(s.charAt(i[0])) || s.charAt(i[0]) == ']'))
				i[0]++;
			if (i[0] >= s.length() || s.charAt(i[0]) == ']') { i[0]++; break; }
			list.add(parseValue(s, i));
		}
		return list;
	}

	private static StringBuilder parseString(String s, int[] i) {
		i[0]++; // skip opening quote
		StringBuilder sb = new StringBuilder();
		while (i[0] < s.length()) {
			char c = s.charAt(i[0]++);
			if (c == '\\') {
				char esc = s.charAt(i[0]++);
				switch (esc) {
					case 'n': sb.append('\n'); break;
					case 'r': sb.append('\r'); break;
					case 't': sb.append('\t'); break;
					case '"': sb.append('"');  break;
					case '\\':sb.append('\\'); break;
					default:  sb.append(esc);
				}
			} else if (c == '"') {
				break;
			} else {
				sb.append(c);
			}
		}
		return sb;
	}

	private static Boolean parseBool(String s, int[] i) {
		if (s.startsWith("true", i[0])) { i[0] += 4; return Boolean.TRUE; }
		i[0] += 5; return Boolean.FALSE;
	}

	private static Number parseNumber(String s, int[] i) {
		int start = i[0];
		while (i[0] < s.length() && "0123456789+-.eE".indexOf(s.charAt(i[0])) >= 0) i[0]++;
		String num = s.substring(start, i[0]);
		try {
			if (num.contains(".") || num.contains("e") || num.contains("E")) return Double.parseDouble(num);
			return Long.parseLong(num);
		} catch (Exception e) {
			return 0;
		}
	}
}
