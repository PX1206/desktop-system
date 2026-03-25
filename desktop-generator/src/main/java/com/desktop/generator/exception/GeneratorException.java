package com.desktop.generator.exception;

public class GeneratorException extends MyException {
	private static final long serialVersionUID = 2556853577480934761L;

	public GeneratorException(String message) {
        super(message);
    }

    public GeneratorException(Integer errorCode, String message) {
        super(errorCode, message);
    }

    public GeneratorException(ApiCode apiCode) {
        super(apiCode);
    }
}
