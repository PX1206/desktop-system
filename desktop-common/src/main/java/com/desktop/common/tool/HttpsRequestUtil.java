package com.desktop.common.tool;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * @author Sakura
 * @date 2024/6/24 17:07
 */
public class HttpsRequestUtil {

    public static String sendPostRequest(String urlString, String jsonInputString) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        // 设置请求方法为POST
        connection.setRequestMethod("POST");

        // 设置请求头
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");

        // 启用输出流，用于发送请求数据
        connection.setDoOutput(true);

        // 设置超时（必需）
        connection.setConnectTimeout(5000); // 连接最多等5秒
        connection.setReadTimeout(10000);   // 响应最多等10秒

        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = jsonInputString.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        // 获取响应
        try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
            StringBuilder response = new StringBuilder();
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
            return response.toString();
        } finally {
            // 关闭连接
            connection.disconnect();
        }
    }

    public static String sendGetRequest(String urlString) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        // 设置请求方法为GET
        connection.setRequestMethod("GET");

        // 设置请求头
        connection.setRequestProperty("Accept", "application/json");

        // 获取响应
        try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
            StringBuilder response = new StringBuilder();
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
            return response.toString();
        } finally {
            // 关闭连接
            connection.disconnect();
        }
    }

    public static String sendGetRequest(String urlString, String token) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        // 设置请求方法为GET
        connection.setRequestMethod("GET");

        // 设置请求头
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Token", token);

        // 获取响应
        try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
            StringBuilder response = new StringBuilder();
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
            return response.toString();
        } finally {
            // 关闭连接
            connection.disconnect();
        }
    }

//    public static String sendGetRequest(String urlString) throws IOException {
//        URL url = new URL(urlString);
//        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
//
//        // 设置请求方法为GET
//        connection.setRequestMethod("GET");
//
//        // 设置请求头
//        connection.setRequestProperty("Accept", "application/json");
//        connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
//
//        // 获取响应码
//        int responseCode = connection.getResponseCode();
//
//        // 如果是301或302重定向
//        if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == HttpURLConnection.HTTP_MOVED_TEMP) {
//            String newUrl = connection.getHeaderField("Location");
//            System.out.println("Redirecting to: " + newUrl);
//            return sendGetRequest(newUrl);  // 递归调用，跟随重定向
//        }
//
//        if (responseCode == HttpURLConnection.HTTP_OK) { // 成功
//            try (BufferedReader br = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))) {
//                StringBuilder response = new StringBuilder();
//                String responseLine;
//                while ((responseLine = br.readLine()) != null) {
//                    response.append(responseLine.trim());
//                }
//                return response.toString();
//            } finally {
//                // 关闭连接
//                connection.disconnect();
//            }
//        } else {
//            // 处理非200响应，打印错误信息
//            return "Error: HTTP response code " + responseCode;
//        }
//    }

    public static byte[] sendPostReturnByte(String urlString, String jsonInputString) throws IOException {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        // 设置请求方法为POST
        connection.setRequestMethod("POST");

        // 设置请求头
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");

        // 启用输出流，用于发送请求数据
        connection.setDoOutput(true);

        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = jsonInputString.getBytes("utf-8");
            os.write(input, 0, input.length);
        }

        // 获取响应
        try (InputStream is = connection.getInputStream()) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int bytesRead;
            byte[] data = new byte[1024];
            while ((bytesRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, bytesRead);
            }
            return buffer.toByteArray();
        } finally {
            // 关闭连接
            connection.disconnect();
        }
    }

}

